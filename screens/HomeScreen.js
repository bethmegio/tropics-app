import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../supabaseClient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FALLBACK_BANNER = "https://images.unsplash.com/photo-1566014633661-349c6fae61e9?w=800";

export default function HomeScreen({ navigation }) {
  const [banners, setBanners] = useState([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [featuredProjects, setFeaturedProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const PAGE_SIZE = 12;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const scrollRef = useRef(null);
  const currentIndex = useRef(0);
  const autoScrollTimer = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Color Scheme
  const colors = {
    primary: "#0EA5E9", // Sky blue
    secondary: "#14B8A6", // Teal
    accent: "#8B5CF6", // Purple
    success: "#10B981", // Emerald
    warning: "#F59E0B", // Amber
    danger: "#dea4a4ff", // Red
    dark: "#1E293B", // Slate 800
    medium: "#64748B", // Slate 500
    light: "#F1F5F9", // Slate 100
    white: "#FFFFFF",
    gradientStart: "#4ab8ebff",
    gradientEnd: "#2e4dc8ff",
    background: "#F8FAFC",
    card: "#FFFFFF",
    textPrimary: "#1E293B",
    textSecondary: "#64748B",
  };

  // Function to get image URL from Supabase storage
  const getImageUrl = (path) => {
    if (!path) return FALLBACK_BANNER;
    
    // If it's already a full URL, return it
    if (path.startsWith('http')) return path;
    
    // If it's a storage path, get the public URL
    const { data } = supabase.storage.from('categories').getPublicUrl(path);
    return data.publicUrl || FALLBACK_BANNER;
  };

  useEffect(() => {
    loadAllInitial();
    return () => stopAutoScroll();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadProducts({ reset: true }), 450);
    return () => clearTimeout(t);
  }, [query]);

  // Start animations when data loads
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  // ------------------ ENHANCED DATA LOADING ------------------
  const loadAllInitial = async () => {
    try {
      setLoading(true);
      setError(null);

      const [banRes, catRes, servRes, projRes] = await Promise.all([
        supabase.from("banners").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("categories").select("*").order("name", { ascending: true }),
        supabase.from("services").select("*").order("id", { ascending: true }),
        supabase.from("projects").select("*").eq("featured", true).limit(4)
      ]);

      if (banRes.error || catRes.error || servRes.error) {
        throw new Error(
          banRes.error?.message || catRes.error?.message || servRes.error?.message || "Failed to fetch data"
        );
      }

      setBanners(banRes.data?.length ? banRes.data : [{ id: "fallback", image_url: FALLBACK_BANNER }]);
      setCategories(catRes.data || []);
      setServices(servRes.data || []);
      setFeaturedProjects(projRes.data || []);

      await loadProducts({ reset: true });

      startAutoScroll();
    } catch (err) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async ({ reset = false } = {}) => {
    try {
      if (reset) {
        setPage(0);
        setHasMore(true);
      }
      if (!hasMore && !reset) return;

      if (reset) setLoadingMore(true);

      if (query?.trim()) {
        setSearching(true);
        const q = query.trim();
        const res = await supabase
          .from("products")
          .select("*")
          .ilike("name", `%${q}%`)
          .order("created_at", { ascending: false })
          .range(0, PAGE_SIZE - 1);

        if (res.error) throw res.error;

        setProducts(res.data || []);
        setHasMore((res.data || []).length === PAGE_SIZE);
        setSearching(false);
        setLoadingMore(false);
        return;
      }

      let prodRes = await supabase
        .from("products")
        .select("*")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (prodRes.error || !prodRes.data?.length) {
        const start = reset ? 0 : page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;

        prodRes = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false })
          .range(start, end);
      }

      if (prodRes.error) throw prodRes.error;

      setProducts(reset ? prodRes.data : [...products, ...prodRes.data]);

      const fetched = prodRes.data?.length || 0;
      if (fetched < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setHasMore(true);
        setPage((prev) => prev + 1);
      }
    } catch (err) {
      setError(err.message || "Could not load products");
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllInitial();
    setRefreshing(false);
  };

  // ------------------ ENHANCED AUTO SCROLL ------------------
  const startAutoScroll = () => {
    stopAutoScroll();
    if (banners.length <= 1) return;
    
    autoScrollTimer.current = setInterval(() => {
      currentIndex.current = (currentIndex.current + 1) % banners.length;
      scrollRef.current?.scrollTo({ 
        x: currentIndex.current * SCREEN_WIDTH, 
        animated: true 
      });
      setBannerIndex(currentIndex.current);
    }, 4000);
  };

  const stopAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  };

  const handleBannerScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.floor(contentOffset / SCREEN_WIDTH);
    currentIndex.current = index;
    setBannerIndex(index);
  };

  // ------------------ ENHANCED HANDLERS ------------------
  const onPressBanner = (banner) => {
    if (!banner) return;
    try {
      if (banner.link_type === "product" && banner.link_id)
        return navigation.navigate("ProductDetails", { id: banner.link_id });

      if (banner.link_type === "category" && banner.link_id)
        return navigation.navigate("Categories", { id: banner.link_id });

      navigation.navigate("Promotions", { bannerId: banner.id });
    } catch (err) {
      console.log('Banner press error:', err);
    }
  };

  const pickIconForCategory = (name = "") => {
    const lower = name.toLowerCase();
    if (lower.includes("pool") || lower.includes("water")) return "water-outline";
    if (lower.includes("chem")) return "flask-outline";
    if (lower.includes("equip") || lower.includes("pump")) return "hardware-chip-outline";
    if (lower.includes("clean")) return "sparkles-outline";
    if (lower.includes("landscape") || lower.includes("garden")) return "leaf-outline";
    if (lower.includes("light")) return "bulb-outline";
    if (lower.includes("heater")) return "thermometer-outline";
    return "grid-outline";
  };

  const getCategoryColor = (name = "") => {
    const lower = name.toLowerCase();
    if (lower.includes("pool") || lower.includes("water")) return colors.primary;
    if (lower.includes("chem")) return colors.warning;
    if (lower.includes("equip")) return colors.secondary;
    if (lower.includes("landscape")) return colors.success;
    if (lower.includes("clean")) return colors.accent;
    if (lower.includes("light")) return "#FCD34D";
    if (lower.includes("heater")) return colors.danger;
    return colors.medium;
  };

  // ------------------ ENHANCED RENDER FUNCTIONS ------------------
  const renderCategoryItem = ({ item, index }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => navigation.navigate("Categories", { id: item.id })}
      >
        <View style={styles.categoryImageContainer}>
          <Image
            source={{ uri: getImageUrl(item.image_url) }}
            style={styles.categoryImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            style={styles.categoryImageOverlay}
          />
          <View style={[styles.categoryIconWrapper, { backgroundColor: getCategoryColor(item.name) }]}>
            <Ionicons 
              name={pickIconForCategory(item.name)} 
              size={18} 
              color={colors.white} 
            />
          </View>
        </View>
        <Text style={styles.categoryText} numberOfLines={2}>
          {item.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderProductCard = ({ item, index }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          { translateY: slideAnim },
          { scale: fadeAnim }
        ],
      }}
    >
      <TouchableOpacity
        style={styles.productCardHorizontal}
        onPress={() => navigation.navigate("ProductDetails", { id: item.id })}
      >
        <Image
          source={{ uri: getImageUrl(item.image_url) }}
          style={styles.productImageHorizontal}
          resizeMode="cover"
        />
        <View style={styles.productInfoHorizontal}>
          <Text numberOfLines={2} style={styles.productName}>
            {item?.name}
          </Text>
          <Text style={styles.productPrice}>
            ₱ {Number(item?.price || 0).toLocaleString()}
          </Text>
          {item?.is_featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderServiceCard = ({ item, index }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
      }}
    >
      <TouchableOpacity 
        style={styles.serviceCard}
        onPress={() => navigation.navigate("Booking", { service: item.name.toLowerCase().replace(/\s+/g, '-') })}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={styles.serviceGradient}
        >
          <Ionicons name="construct-outline" size={28} color={colors.white} />
        </LinearGradient>
        <Text numberOfLines={2} style={styles.serviceName}>
          {item?.name}
        </Text>
        <Text style={styles.servicePrice}>
          Starting at ₱ {Number(item?.price || 0).toLocaleString()}
        </Text>
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={() => navigation.navigate("Booking", { service: item.name.toLowerCase().replace(/\s+/g, '-') })}
        >
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderProjectCard = ({ item, index }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity 
        style={styles.projectCard}
        onPress={() => navigation.navigate("Projects")}
      >
        <Image
          source={{ uri: item?.image_url || FALLBACK_BANNER }}
          style={styles.projectImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.projectOverlay}
        >
          <Text style={styles.projectTitle}>{item?.title}</Text>
          <Text style={styles.projectLocation}>{item?.location}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderShimmer = () => (
    <View style={styles.shimmerContainer}>
      {[1, 2, 3, 4].map((item) => (
        <View key={item} style={styles.shimmerCard}>
          <LinearGradient
            colors={["#f0f0f0", "#e0e0e0", "#f0f0f0"]}
            style={styles.shimmerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
      ))}
    </View>
  );

  // ------------------ QUICK ACTIONS ------------------
  const QuickActionButton = ({ icon, title, onPress, color = colors.primary }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <LinearGradient
        colors={[color, `${color}DD`]}
        style={styles.quickActionGradient}
      >
        <Ionicons name={icon} size={24} color={colors.white} />
      </LinearGradient>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Tropical Paradise...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="sad-outline" size={64} color={colors.danger} />
        <Text style={styles.errorText}>Oops! Something went wrong</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            loadAllInitial();
          }}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        } 
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* 🟦 ENHANCED HEADER WITH LOGO & QUICK ACTIONS */}
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={styles.header}
        >
          {/* Logo and Company Info - CENTERED */}
          <View style={styles.headerTop}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[colors.white, colors.light]}
                style={styles.logoBackground}
              >
                <Image
                  source={require('../assets/logo.png')}
                  style={styles.logo}
                />
              </LinearGradient>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.welcomeText}>Welcome to</Text>
              <Text style={styles.companyName}>Tropics Pools & Landscape</Text>
            </View>
          </View>

          {/* Quick Actions Grid */}
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              icon="calendar"
              title="Book Service"
              onPress={() => navigation.navigate("Booking")}
              color={colors.primary}
            />
            <QuickActionButton
              icon="call"
              title="Contact Us"
              onPress={() => navigation.navigate("Contact")}
              color={colors.success}
            />
            <QuickActionButton
              icon="images"
              title="Projects"
              onPress={() => navigation.navigate("Projects")}
              color={colors.warning}
            />
          </View>
        </LinearGradient>

        {/* 🔍 ENHANCED SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.medium} />
          <TextInput
            placeholder="Search pools, landscaping, chemicals..."
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholderTextColor={colors.medium}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={20} color={colors.medium} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate("Cart")}>
              <Ionicons name="cart-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* 🎠 ENHANCED BANNER CAROUSEL */}
        <View style={styles.bannerContainer}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onTouchStart={stopAutoScroll}
            onMomentumScrollEnd={handleBannerScroll}
            onScrollBeginDrag={stopAutoScroll}
            onScrollEndDrag={() => setTimeout(startAutoScroll, 5000)}
          >
            {banners.map((banner, index) => (
              <Pressable 
                key={banner?.id || index} 
                onPress={() => onPressBanner(banner)} 
                style={styles.bannerItem}
              >
                <Image 
                  source={{ uri: banner?.image_url || FALLBACK_BANNER }} 
                  style={styles.bannerImage} 
                  resizeMode="cover" 
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.3)']}
                  style={styles.bannerOverlay}
                />
              </Pressable>
            ))}
          </ScrollView>
          
          {/* Enhanced Dots Indicator */}
          <View style={styles.dotsContainer}>
            {banners.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  currentIndex.current = index;
                  scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
                  setBannerIndex(index);
                }}
              >
                <View 
                  style={[
                    styles.dot,
                    index === bannerIndex ? styles.activeDot : styles.inactiveDot
                  ]} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 🏷️ ENHANCED CATEGORIES WITH IMAGES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shop Categories</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Categories")}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={categories}
            horizontal
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.categoriesList}
            showsHorizontalScrollIndicator={false}
            renderItem={renderCategoryItem}
          />
        </View>

        {/* ⭐ FEATURED PRODUCTS WITH BACKDROP */}
        <View style={styles.productsSection}>
          <LinearGradient
            colors={['rgba(14, 165, 233, 0.05)', 'rgba(139, 92, 246, 0.05)']}
            style={styles.productsBackground}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Products</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Products")}>
                <Text style={styles.seeAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={products.length ? products : Array(4).fill({})}
              horizontal
              keyExtractor={(_, index) => `product-${index}`}
              contentContainerStyle={styles.productsRow}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }) => 
                item.id ? renderProductCard({ item, index }) : renderShimmer()
              }
              onEndReached={() => {
                if (!loadingMore && hasMore && !searching) {
                  setLoadingMore(true);
                  loadProducts();
                }
              }}
              onEndReachedThreshold={0.4}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadingMore}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
            />
          </LinearGradient>
        </View>

        {/* 🛠️ ENHANCED SERVICES SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Our Services</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Services")}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={services.length ? services : Array(4).fill({})}
            horizontal
            keyExtractor={(_, index) => `service-${index}`}
            contentContainerStyle={styles.servicesList}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) =>
              item.id ? renderServiceCard({ item, index }) : renderShimmer()
            }
          />
        </View>

        {/* 🏆 FEATURED PROJECTS */}
        {featuredProjects.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Projects</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Projects")}>
                <Text style={styles.seeAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={featuredProjects}
              horizontal
              keyExtractor={(item) => `project-${item.id}`}
              contentContainerStyle={styles.projectsList}
              showsHorizontalScrollIndicator={false}
              renderItem={renderProjectCard}
            />
          </View>
        )}


        {/* 📍 QUICK INFO */}
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={20} color={colors.primary} />
            <Text style={styles.infoText}>Mon-Sun: 7AM-7PM</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="navigate" size={20} color={colors.primary} />
            <Text style={styles.infoText}>Free Site Visits</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text style={styles.infoText}>Licensed & Insured</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eff2f4ff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },

  // Header Styles with Logo
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 25,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.5)",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  headerTextContainer: {
    alignItems: "center",
  },
  welcomeText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 5,
  },
  companyName: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 10,
  },
  quickAction: {
    alignItems: "center",
    width: 70,
  },
  quickActionGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },

  // Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    margin: 10,
    marginTop: -15,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 12,
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: "#286cc6ff",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "500",
  },

  // Banner Carousel
  bannerContainer: {
    marginBottom: 25,
  },
  bannerItem: {
    width: SCREEN_WIDTH,
    height: 220,
  },
  bannerImage: {
    width: SCREEN_WIDTH - 40,
    height: 220,
    borderRadius: 24,
    marginHorizontal: 20,
  },
  bannerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    height: 80,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#0EA5E9",
    width: 24,
  },
  inactiveDot: {
    backgroundColor: "#CBD5E1",
  },

  // Section Styles
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.5,
  },
  seeAll: {
    color: "#0EA5E9",
    fontWeight: "700",
    fontSize: 14,
  },

  // Categories with Images
  categoriesList: {
    paddingHorizontal: 15,
  },
  categoryCard: {
    width: 100,
    alignItems: "center",
    marginHorizontal: 8,
  },
  categoryImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 10,
    overflow: "hidden",
    position: "relative",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  categoryIconWrapper: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
    lineHeight: 16,
  },

  // Products - HORIZONTAL ROW WITH BACKDROP
  productsSection: {
    marginHorizontal: 10,
    marginBottom: 25,
    borderRadius: 24,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  productsBackground: {
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  productsRow: {
    paddingVertical: 5,
  },
  productCardHorizontal: {
    width: 170,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    marginRight: 14,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  productImageHorizontal: {
    width: "100%",
    height: 110,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: "#F1F5F9",
  },
  productInfoHorizontal: {
    flex: 1,
  },
  productName: {
    fontWeight: "700",
    fontSize: 15,
    color: "#1e293b",
    lineHeight: 20,
    marginBottom: 8,
  },
  productPrice: {
    fontWeight: "800",
    color: "#0EA5E9",
    fontSize: 18,
  },
  featuredBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#FCD34D",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    elevation: 3,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
  },

  // Services
  servicesList: {
    paddingHorizontal: 15,
  },
  serviceCard: {
    width: 170,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginRight: 14,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  serviceGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    elevation: 4,
  },
  serviceName: {
    fontWeight: "700",
    fontSize: 15,
    color: "#1E293B",
    marginBottom: 6,
    lineHeight: 20,
  },
  servicePrice: {
    fontWeight: "600",
    color: "#64748B",
    fontSize: 13,
    marginBottom: 14,
  },
  bookButton: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: "center",
    elevation: 3,
  },
  bookButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  // Projects
  projectsList: {
    paddingHorizontal: 15,
  },
  projectCard: {
    width: 240,
    height: 160,
    borderRadius: 20,
    marginRight: 14,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  projectImage: {
    width: "100%",
    height: "100%",
  },
  projectOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  projectTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 4,
  },
  projectLocation: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
  },

  // Emergency Banner
  emergencyBanner: {
    marginHorizontal: 20,
    marginBottom: 25,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  emergencyGradient: {
    padding: 22,
  },
  emergencyContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  emergencyText: {
    flex: 1,
    marginLeft: 14,
  },
  emergencyTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 17,
    marginBottom: 4,
  },
  emergencySubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
  },

  // Info Section
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingVertical: 22,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  infoItem: {
    alignItems: "center",
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    color: "#475569",
    marginTop: 6,
    textAlign: "center",
    fontWeight: "600",
  },

  // Shimmer Loading
  shimmerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 15,
  },
  shimmerCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    margin: 8,
    borderRadius: 16,
    overflow: "hidden",
  },
  shimmerGradient: {
    width: "100%",
    height: 180,
  },
  loadingMore: {
    padding: 20,
    alignItems: "center",
    width: "100%",
  },
});