import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
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

export default function CategoriesScreen({ navigation, route }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingToCart, setAddingToCart] = useState({}); // Track which product is being added

  // Get category from navigation params if coming from HomeScreen
  const initialCategory = route.params?.id || null;

  // Helper function for safe product counting
  const getProductsCountByCategory = (products, categoryId) => {
    return products.filter(p => p && p.category_id === categoryId).length;
  };

  useEffect(() => {
    loadCategoriesAndProducts();
  }, []);

  useEffect(() => {
    if (initialCategory && categories.length > 0) {
      const category = categories.find(cat => cat.id === initialCategory);
      if (category) {
        setSelectedCategory(category);
        filterProductsByCategory(category.id);
      }
    }
  }, [initialCategory, categories]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = products.filter(product =>
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else if (selectedCategory) {
      filterProductsByCategory(selectedCategory.id);
    } else {
      setFilteredProducts(products);
    }
  }, [searchQuery, products, selectedCategory]);

  const loadCategoriesAndProducts = async () => {
    try {
      setLoading(true);

      const [categoriesRes, productsRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("products").select("*").order("created_at", { ascending: false })
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (productsRes.error) throw productsRes.error;

      setCategories(categoriesRes.data || []);
      setProducts(productsRes.data || []);
      
      // If no specific category selected, show all products
      if (!initialCategory) {
        setFilteredProducts(productsRes.data || []);
      }

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterProductsByCategory = (categoryId) => {
    // ✅ FIXED: Safe filtering with null check
    const filtered = products.filter(product => {
      if (!product || product.category_id === undefined || product.category_id === null) {
        return false; // Skip products without category_id
      }
      return product.category_id === categoryId;
    });
    setFilteredProducts(filtered);
  };

  const handleCategoryPress = (category) => {
    setSelectedCategory(category);
    filterProductsByCategory(category.id);
    setSearchQuery(""); // Clear search when selecting category
  };

  const handleShowAll = () => {
    setSelectedCategory(null);
    setFilteredProducts(products);
    setSearchQuery(""); // Clear search when showing all
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategoriesAndProducts();
    setRefreshing(false);
  };

  // Add to Cart function
  const addToCart = async (product) => {
    try {
      setAddingToCart(prev => ({ ...prev, [product.id]: true }));
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Login Required', 'Please login to add items to cart', [
          {
            text: 'Login',
            onPress: () => navigation.navigate('Login'),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]);
        return;
      }

      // Check if product already in cart
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();

      if (existingItem) {
        // Update quantity if already in cart
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);

        if (error) throw error;
        Alert.alert('Success', 'Product quantity updated in cart!');
      } else {
        // Add new item to cart
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity: 1,
          });

        if (error) throw error;
        Alert.alert('Success', 'Product added to cart!');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add product to cart');
    } finally {
      setAddingToCart(prev => ({ ...prev, [product.id]: false }));
    }
  };

  const getCategoryIcon = (categoryName) => {
    const name = categoryName?.toLowerCase() || "";
    if (name.includes("pool") || name.includes("water")) return "water-outline";
    if (name.includes("chem")) return "flask-outline";
    if (name.includes("equip") || name.includes("pump")) return "construct-outline";
    if (name.includes("clean")) return "sparkles-outline";
    if (name.includes("landscape") || name.includes("garden")) return "leaf-outline";
    if (name.includes("light")) return "bulb-outline";
    if (name.includes("heater")) return "thermometer-outline";
    if (name.includes("filter")) return "funnel-outline";
    return "grid-outline";
  };

  const getCategoryColor = (categoryName) => {
    const name = categoryName?.toLowerCase() || "";
    if (name.includes("pool") || name.includes("water")) return "#0EA5E9";
    if (name.includes("chem")) return "#F59E0B";
    if (name.includes("equip")) return "#14B8A6";
    if (name.includes("landscape")) return "#10B981";
    if (name.includes("clean")) return "#8B5CF6";
    if (name.includes("light")) return "#FCD34D";
    if (name.includes("heater")) return "#EF4444";
    return "#64748B";
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory?.id === item.id && styles.selectedCategory
      ]}
      onPress={() => handleCategoryPress(item)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(item.name) }]}>
        <Ionicons name={getCategoryIcon(item.name)} size={24} color="#fff" />
      </View>
      <Text style={styles.categoryName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.productCount}>
        {/* ✅ FIXED: Using safe helper function */}
        {getProductsCountByCategory(products, item.id)} products
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate("ProductDetails", { product: item })}
    >
      <Image
        source={{ uri: item.image_url || "https://images.unsplash.com/photo-1566014633661-349c6fae61e9?w=400" }}
        style={styles.productImage}
        resizeMode="cover"
      />
      
      {/* Badges */}
      <View style={styles.badgeContainer}>
        {item.is_featured && (
          <View style={[styles.badge, styles.featuredBadge]}>
            <Text style={styles.badgeText}>Featured</Text>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description || "Premium quality product"}
        </Text>
        <Text style={styles.productPrice}>
          ₱ {Number(item.price || 0).toLocaleString()}
        </Text>
        
        {/* Add to Cart Button */}
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            addingToCart[item.id] && styles.addToCartButtonDisabled
          ]}
          onPress={(e) => {
            e.stopPropagation(); // Prevent navigation to product details
            addToCart(item);
          }}
          disabled={addingToCart[item.id]}
        >
          {addingToCart[item.id] ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="cart-outline" size={16} color="#fff" />
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={styles.loadingText}>Loading Categories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedCategory ? selectedCategory.name : "All Categories"}
        </Text>
        <Text style={styles.headerSubtitle}>
          {selectedCategory 
            ? `${filteredProducts.length} products available` 
            : "Browse all products"
          }
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#777" />
        <TextInput
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          placeholderTextColor="#64748B"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#777" />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Categories Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity onPress={handleShowAll}>
              <Text style={styles.seeAllButton}>
                {selectedCategory ? "Show All" : "View All"}
              </Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.categoriesList}
            renderItem={renderCategoryItem}
          />
        </View>

        {/* Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory ? selectedCategory.name : "All Products"} 
              {` (${filteredProducts.length})`}
            </Text>
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No products found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery 
                  ? "Try adjusting your search terms"
                  : "No products available in this category"
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              scrollEnabled={false}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.productsGrid}
              renderItem={renderProductItem}
              numColumns={2}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 20,
    marginTop: -18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 12,
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "500",
  },
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
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  seeAllButton: {
    color: "#0EA5E9",
    fontWeight: "600",
    fontSize: 14,
  },
  categoriesList: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  categoryItem: {
    width: 120,
    alignItems: "center",
    marginHorizontal: 8,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedCategory: {
    borderWidth: 2,
    borderColor: "#0EA5E9",
    backgroundColor: "#f0f9ff",
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 4,
  },
  productCount: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
  },
  productsGrid: {
    paddingHorizontal: 20,
  },
  productCard: {
    flex: 1,
    margin: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minHeight: 250, // Increased height for the button
  },
  productImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginBottom: 10,
  },
  badgeContainer: {
    position: "absolute",
    top: 8,
    left: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredBadge: {
    backgroundColor: "#FFD700",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#333",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: "600",
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
    lineHeight: 18,
  },
  productDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    lineHeight: 16,
  },
  productPrice: {
    fontWeight: "700",
    color: "#0EA5E9",
    fontSize: 16,
    marginBottom: 8,
  },
  addToCartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5E9",
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  addToCartButtonDisabled: {
    backgroundColor: "#ccc",
  },
  addToCartText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 16,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});