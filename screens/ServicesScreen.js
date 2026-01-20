import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabaseClient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 45) / 2;

export default function ServicesScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredServices, setFeaturedServices] = useState([]);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const fetchServices = async () => {
    try {
      setLoading(true);
      
      // ✅ FIXED: Fetch services without the non-existent is_featured column
      const [servicesResponse, categoriesResponse] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .order('name'), // Removed is_featured ordering
        supabase
          .from('categories')
          .select('*')
          .order('name')
      ]);

      if (servicesResponse.error) throw servicesResponse.error;
      if (categoriesResponse.error) throw categoriesResponse.error;

      const servicesData = servicesResponse.data || [];
      const categoriesData = categoriesResponse.data || [];

      setServices(servicesData);
      setCategories(['All', ...categoriesData.map((c) => c.name)]);
      
      // ✅ FIXED: Use popular field instead of is_featured, or just take first 3 as featured
      setFeaturedServices(servicesData.slice(0, 3) || []);

    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
  };

  const handleBookPress = async (serviceItem) => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (!data?.session) {
        Alert.alert('Login Required', 'You must be logged in to book a service.', [
          {
            text: 'Go to Login',
            onPress: () => navigation.navigate('Login', { 
              redirectTo: 'Booking', 
              service: serviceItem 
            }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]);
        return;
      }

      navigation.navigate('Booking', { service: serviceItem });
    } catch (error) {
      console.error('Auth error:', error.message);
      Alert.alert('Error', 'Failed to check login status.');
    }
  };

  const showServiceDetails = (service) => {
    Alert.alert(
      service.name,
      `Description: ${service.description || 'No description available'}\nPrice: ₱${service.price || 'N/A'}\nAvailable: ${service.available !== false ? 'Yes' : 'No'}`,
      [{ text: 'OK' }]
    );
  };

  const handleQuickBook = (service) => {
    Alert.alert(
      `Book ${service.name}`,
      `Would you like to book ${service.name} for ₱${service.price}?`,
      [
        {
          text: 'Book Now',
          onPress: () => handleBookPress(service),
        },
        { text: 'View Details', onPress: () => showServiceDetails(service) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

 

  // Filter services based on category and search
  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === 'All' || service.category === selectedCategory;
    const matchesSearch = service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderService = ({ item, index }) => (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => showServiceDetails(item)}
        activeOpacity={0.8}
        disabled={item.available === false}
      >
        <Image 
          source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1566014633661-349c6fae61e9?w=400' }} 
          style={styles.cardImage} 
        />
        
        {/* Badges */}
        <View style={styles.badgeContainer}>
          {/* ✅ FIXED: Only show popular badge if the field exists */}
          {item.popular && (
            <View style={[styles.badge, styles.popularBadge]}>
              <Ionicons name="flash" size={12} color="#fff" />
              <Text style={styles.badgeText}>Popular</Text>
            </View>
          )}
          {/* Show featured badge for first 3 services */}
          {featuredServices.some(fs => fs.id === item.id) && (
            <View style={[styles.badge, styles.featuredBadge]}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={styles.badgeText}>Featured</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardName}>{item.name}</Text>
          <View style={styles.priceDuration}>
           
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          
          {/* Service Features */}
          <View style={styles.features}>
           
            <View style={styles.feature}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.featureText}>
                {item.available === false ? 'Unavailable' : 'Available'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.bookButton,
          item.available === false && styles.disabledButton
        ]}
        onPress={() => handleQuickBook(item)}
        disabled={item.available === false}
      >
        <Ionicons 
          name={item.available === false ? "close-circle" : "calendar"} 
          size={16} 
          color="#fff" 
        />
        <Text style={styles.bookButtonText}>
          {item.available === false ? 'Unavailable' : 'Book Now'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderFeaturedService = ({ item }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => showServiceDetails(item)}
    >
      <Image 
        source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1566014633661-349c6fae61e9?w=400' }} 
        style={styles.featuredImage} 
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.featuredGradient}
      >
        <View style={styles.featuredContent}>
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
          <Text style={styles.featuredName}>{item.name}</Text>
          
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BFFF" />
        <Text style={styles.loadingText}>Loading Services...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#00BFFF', '#0077b6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Our Services</Text>
          <Text style={styles.headerSubtitle}>Professional pool & landscape services</Text>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#777" />
        <TextInput
          placeholder="Search services..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          placeholderTextColor="#999"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#777" />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#00BFFF"]}
            tintColor="#00BFFF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Featured Services - Only show if we have services */}
        {featuredServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Services</Text>
              <Ionicons name="star" size={20} color="#FFD700" />
            </View>
            <FlatList
              data={featuredServices}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.featuredList}
              renderItem={renderFeaturedService}
            />
          </View>
        )}

        {/* Categories Tabs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.tabsContainer}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.tab,
                  selectedCategory === cat && styles.selectedTab,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[
                  styles.tabText,
                  selectedCategory === cat && styles.selectedTabText
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Services Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory === 'All' ? 'All Services' : selectedCategory}
              {` (${filteredServices.length})`}
            </Text>
          </View>

          {filteredServices.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="construct-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No services found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery 
                  ? "Try adjusting your search terms"
                  : "No services available in this category"
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredServices}
              scrollEnabled={false}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.servicesGrid}
              renderItem={renderService}
              numColumns={2}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ... (styles remain exactly the same as previous version)
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FBFF' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: -18,
    marginBottom: 20,
    marginHorizontal: 0,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 0,
    elevation: 12,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  tabsContainer: { 
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  tab: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedTab: {
    backgroundColor: '#00BFFF',
  },
  tabText: { 
    fontWeight: '600', 
    fontSize: 14, 
    color: '#666' 
  },
  selectedTabText: {
    color: '#fff',
  },
  featuredList: {
    paddingHorizontal: 15,
  },
  featuredCard: {
    width: 280,
    height: 160,
    marginRight: 15,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: 15,
  },
  featuredContent: {
    
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  featuredName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  featuredPrice: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
  },
  servicesGrid: {
    paddingHorizontal: 15,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardImage: { 
    width: '100%', 
    height: 120 
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  featuredBadge: {
    backgroundColor: '#FF6B6B',
  },
  popularBadge: {
    backgroundColor: '#4ECDC4',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 2,
  },
  cardContent: {
    padding: 12,
  },
  cardName: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#333',
    marginBottom: 4,
  },
  priceDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardPrice: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#00BFFF' 
  },
  duration: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  cardDesc: { 
    fontSize: 12, 
    color: '#666', 
    lineHeight: 16,
    marginBottom: 8,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00BFFF',
    paddingVertical: 10,
    margin: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  bookButtonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 14,
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});