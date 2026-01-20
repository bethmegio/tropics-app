import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../supabaseClient';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: true,
    darkMode: false,
    locationServices: true,
  });
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' or 'orders'

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
  try {
    const { data: { user: currentUser }, error } = await supabase.auth.getUser();
    
    if (error) {
       setUser(null);
       setLoading(false);
      return;
     }

    if (currentUser) {
      setUser({
        id: currentUser.id,
        email: currentUser.email,
        full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
        phone: currentUser.user_metadata?.phone || '',
        created_at: currentUser.created_at,
      });
      
      await Promise.all([loadBookings(), loadOrders()]);
    } else {
      setUser(null);
    }
  } catch (error) {
     setUser(null);
   } finally {
     setLoading(false);
   }
 };
  const loadBookings = async () => {
    try {
      setBookingsLoading(true);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setBookings([]);
        return;
      }

      // Fetch real bookings from database using the actual user ID
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (bookingsError) {
         setBookings([]);
         return;
       }

       setBookings(bookingsData || []);
       
     } catch (error) {
       setBookings([]);
     } finally {
       setBookingsLoading(false);
     }
   };

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setOrders([]);
        return;
      }

      // Fetch orders with order items and product details using actual user ID
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              id,
              name,
              price,
              image_url,
              description
            )
          )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
         setOrders([]);
         return;
       }

       setOrders(ordersData || []);
     } catch (error) {
       setOrders([]);
     } finally {
       setOrdersLoading(false);
     }
   };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([checkUser(), loadBookings(), loadOrders()]);
    setRefreshing(false);
    Alert.alert('Refreshed', 'Your profile has been updated.');
  };

  const handleSettingToggle = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
    
    const settingNames = {
      notifications: 'Push Notifications',
      emailUpdates: 'Email Updates', 
      darkMode: 'Dark Mode',
      locationServices: 'Location Services'
    };
    
    Alert.alert(
      'Settings Updated',
      `${settingNames[setting]} ${!settings[setting] ? 'enabled' : 'disabled'}`
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            } catch (error) {
              console.log('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    if (!user) return;
    Alert.alert('Edit Profile', 'Edit profile functionality will be available soon!', [{ text: 'OK' }]);
  };

  const handleMenuPress = (title, message = 'This feature will be available soon!') => {
    Alert.alert(title, message, [{ text: 'OK' }]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'completed': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'completed': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const BookingItem = ({ booking }) => (
    <View style={styles.bookingItem}>
      <View style={styles.bookingHeader}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{booking.service || 'Unknown Service'}</Text>
          <Text style={styles.bookingDate}>
            {formatDate(booking.date)} • {booking.time || 'Time TBD'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
          <Ionicons name={getStatusIcon(booking.status)} size={14} color={getStatusColor(booking.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
            {booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : 'Pending'}
          </Text>
        </View>
      </View>
      
      {booking.admin_notes && (
        <View style={styles.adminNotes}>
          <Ionicons name="information-circle" size={16} color="#0077b6" />
          <Text style={styles.notesText}>{booking.admin_notes}</Text>
        </View>
      )}
      
      <View style={styles.bookingFooter}>
        <Text style={styles.contactText}>Contact: {booking.contact || 'Not provided'}</Text>
        <Text style={styles.bookingId}>ID: {booking.id}</Text>
      </View>
    </View>
  );

  const OrderItem = ({ order }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>Order #{order.id}</Text>
          <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
          <Ionicons name={getStatusIcon(order.status)} size={14} color={getStatusColor(order.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending'}
          </Text>
        </View>
      </View>

      {/* Order Products */}
      <View style={styles.orderProducts}>
        {order.order_items?.map((item, index) => (
          <View key={item.id} style={styles.productItem}>
            <Image
              source={{ uri: item.products?.image_url || 'https://images.unsplash.com/photo-1566014633661-349c6fae61e9?w=400' }}
              style={styles.productImage}
            />
            <View style={styles.productDetails}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.products?.name || 'Unknown Product'}
              </Text>
              <Text style={styles.productPrice}>
                ₱{Number(item.price || 0).toLocaleString()} x {item.quantity || 1}
              </Text>
            </View>
            <Text style={styles.productTotal}>
              ₱{Number((item.price || 0) * (item.quantity || 1)).toLocaleString()}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>Total: ₱{Number(order.total_amount || 0).toLocaleString()}</Text>
        <TouchableOpacity 
          style={styles.trackButton}
          onPress={() => Alert.alert('Pickup Information', 'Your order is ready for pickup at our store!\n\n📍 123 Tropical Lane, Paradise City\n📞 (555) 123-POOL')}
        >
          <Text style={styles.trackButtonText}>Pickup Info</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const MenuItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true, 
    isSwitch = false, 
    switchValue, 
    onToggle,
    color = "#0077b6"
  }) => (
    <TouchableOpacity 
      style={styles.menuItem} 
      onPress={onPress}
      disabled={isSwitch}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onToggle}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={switchValue ? '#0077b6' : '#f4f3f4'}
        />
      ) : showArrow ? (
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      ) : null}
    </TouchableOpacity>
  );

  const ProfileSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0077b6" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Ionicons name="person-circle-outline" size={80} color="#0077b6" />
        <Text style={styles.loginTitle}>Welcome to Tropics Pools!</Text>
        <Text style={styles.loginSubtitle}>Please login to view your profile and orders</Text>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Login to Your Account</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.signupButton}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.signupButtonText}>Create New Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#0077b6"]}
            tintColor="#0077b6"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Profile Info */}
        <LinearGradient
          colors={['#4ab8ebff', '#2e4dc8ff']}
          style={styles.header}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            </View>
            
            <Text style={styles.userName}>
              {user?.full_name || 'User'}
            </Text>
            <Text style={styles.userEmail}>
              {user?.email || 'No email'}
            </Text>
            
            <TouchableOpacity 
              style={styles.editProfileButton}
              onPress={handleEditProfile}
            >
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{orders.length}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {bookings.length}
            </Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {orders.filter(o => o.status === 'completed').length + bookings.filter(b => b.status === 'completed').length}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* My Orders & Bookings Section */}
        <ProfileSection title="My Orders & Bookings">
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'bookings' && styles.activeTab]}
              onPress={() => setActiveTab('bookings')}
            >
              <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>
                Service Bookings ({bookings.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
              onPress={() => setActiveTab('orders')}
            >
              <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
                Product Orders ({orders.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content based on active tab */}
          {activeTab === 'bookings' ? (
            bookingsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0077b6" />
                <Text style={styles.loadingText}>Loading bookings...</Text>
              </View>
            ) : bookings.length > 0 ? (
              bookings.map((booking) => (
                <BookingItem key={booking.id} booking={booking} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color="#ccc" />
                <Text style={styles.emptyStateText}>No service bookings yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Book a service to see your appointments here
                </Text>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Booking')}
                >
                  <Text style={styles.actionButtonText}>Book a Service</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            ordersLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0077b6" />
                <Text style={styles.loadingText}>Loading orders...</Text>
              </View>
            ) : orders.length > 0 ? (
              orders.map((order) => (
                <OrderItem key={order.id} order={order} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="bag-outline" size={40} color="#ccc" />
                <Text style={styles.emptyStateText}>No product orders yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Purchase products to see your order history here
                </Text>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Categories')}
                >
                  <Text style={styles.actionButtonText}>Shop Products</Text>
                </TouchableOpacity>
              </View>
            )
          )}
        </ProfileSection>

        {/* Account Section */}
        <ProfileSection title="Account">
          <MenuItem
            icon="person-outline"
            title="Personal Information"
            subtitle="Update your personal details"
            onPress={handleEditProfile}
          />
          <MenuItem
            icon="lock-closed-outline"
            title="Security"
            subtitle="Change password & security settings"
            onPress={() => handleMenuPress('Security', 'Security settings will be available soon!')}
          />
          <MenuItem
            icon="location-outline"
            title="Addresses"
            subtitle="Manage your delivery addresses"
            onPress={() => handleMenuPress('Addresses', 'Address management coming soon!')}
          />
          <MenuItem
            icon="card-outline"
            title="Payment Methods"
            subtitle="Add or remove payment cards"
            onPress={() => handleMenuPress('Payment Methods', 'Payment methods feature coming soon!')}
          />
        </ProfileSection>

        {/* Preferences Section */}
        <ProfileSection title="Preferences">
          <MenuItem
            icon="notifications-outline"
            title="Push Notifications"
            isSwitch={true}
            switchValue={settings.notifications}
            onToggle={() => handleSettingToggle('notifications')}
          />
           
          <MenuItem
            icon="mail-outline"
            title="Email Updates"
            subtitle="Receive booking confirmations & updates"
            isSwitch={true}
            switchValue={settings.emailUpdates}
            onToggle={() => handleSettingToggle('emailUpdates')}
          />
          <MenuItem
            icon="moon-outline"
            title="Dark Mode"
            isSwitch={true}
            switchValue={settings.darkMode}
            onToggle={() => handleSettingToggle('darkMode')}
          />
          <MenuItem
            icon="navigate-outline"
            title="Location Services"
            subtitle="For local recommendations"
            isSwitch={true}
            switchValue={settings.locationServices}
            onToggle={() => handleSettingToggle('locationServices')}
          />
        </ProfileSection>

        {/* Support Section */}
        <ProfileSection title="Support">
          <MenuItem
            icon="help-circle-outline"
            title="Help & Support"
            onPress={() => handleMenuPress('Help & Support', 'Contact us at support@tropics.com')}
          />
          <MenuItem
            icon="document-text-outline"
            title="Terms & Conditions"
            onPress={() => handleMenuPress('Terms & Conditions', 'Terms screen coming soon!')}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            onPress={() => handleMenuPress('Privacy Policy', 'Privacy policy screen coming soon!')}
          />
          <MenuItem
            icon="information-circle-outline"
            title="About Us"
            onPress={() => handleMenuPress('About Us', 'Tropics Pools & Landscape - Creating paradise since 2010!')}
          />
        </ProfileSection>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color="#FF6B6B" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Tropics Pools & Landscape</Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.versionText}>
            Member since {new Date(user.created_at).getFullYear()}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#0077b6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#0077b6',
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonText: {
    color: '#0077b6',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  editProfileButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  editProfileText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -15,
    borderRadius: 16,
    paddingVertical: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0077b6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0077b6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#0077b6',
  },
  // Booking Styles
  bookingItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adminNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: '#0077b6',
    lineHeight: 16,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 12,
    color: '#666',
  },
  bookingId: {
    fontSize: 12,
    color: '#999',
  },
  // Order Styles
  orderItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  orderProducts: {
    marginBottom: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 12,
    color: '#666',
  },
  productTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0077b6',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  trackButton: {
    backgroundColor: '#0077b6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Empty State
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#0077b6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  // Menu Item Styles
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});
