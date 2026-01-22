import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Appearance,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import { supabase } from '../supabaseClient';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    locationServices: true,
  });
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' or 'orders'
  const colorScheme = useColorScheme();

  // Initialize dark mode from system preference or saved setting
  useEffect(() => {
    const initDarkMode = async () => {
      try {
        const saved = await AsyncStorage.getItem('darkMode');
        if (saved !== null) {
          setSettings(prev => ({ ...prev, darkMode: JSON.parse(saved) }));
        } else {
          setSettings(prev => ({ ...prev, darkMode: colorScheme === 'dark' }));
        }
      } catch (error) {
        console.log('Error loading dark mode preference:', error);
        setSettings(prev => ({ ...prev, darkMode: colorScheme === 'dark' }));
      }
    };
    
    initDarkMode();
    
    // Listen for system color scheme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme === 'dark') {
        setSettings(prev => ({ ...prev, darkMode: true }));
      } else {
        setSettings(prev => ({ ...prev, darkMode: false }));
      }
    });
    
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    checkUser();
  }, []);

  // Define color schemes
  const colors = useMemo(() => ({
    light: {
      primary: '#0077b6',
      background: '#f8f9fa',
      card: '#ffffff',
      text: '#333333',
      textSecondary: '#666666',
      border: '#f0f0f0',
      shadow: '#000',
      gradient: ['#4ab8ebff', '#2e4dc8ff'],
      danger: '#FF6B6B',
      success: '#10B981',
      warning: '#F59E0B',
    },
    dark: {
      primary: '#4ab8eb',
      background: '#121212',
      card: '#1e1e1e',
      text: '#ffffff',
      textSecondary: '#b0b0b0',
      border: '#333333',
      shadow: '#000',
      gradient: ['#1a3b5d', '#0d1b3a'],
      danger: '#ff5252',
      success: '#34d399',
      warning: '#fbbf24',
    }
  }), []);

  const currentColors = settings.darkMode ? colors.dark : colors.light;

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: currentColors.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: currentColors.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: currentColors.textSecondary,
    },
    loginTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: currentColors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    loginSubtitle: {
      fontSize: 16,
      color: currentColors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
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
    statsContainer: {
      flexDirection: 'row',
      backgroundColor: currentColors.card,
      marginHorizontal: 20,
      marginTop: -15,
      borderRadius: 16,
      paddingVertical: 20,
      elevation: 4,
      shadowColor: currentColors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    statNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: currentColors.primary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: currentColors.textSecondary,
      fontWeight: '500',
    },
    statDivider: {
      width: 1,
      backgroundColor: currentColors.border,
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: currentColors.text,
      marginBottom: 12,
    },
    sectionContent: {
      backgroundColor: currentColors.card,
      borderRadius: 16,
      overflow: 'hidden',
      elevation: 2,
      shadowColor: currentColors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    tabContainer: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: currentColors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: currentColors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: currentColors.textSecondary,
    },
    activeTabText: {
      color: currentColors.primary,
    },
    bookingItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: currentColors.border,
    },
    serviceName: {
      fontSize: 16,
      fontWeight: '600',
      color: currentColors.text,
      marginBottom: 4,
    },
    bookingDate: {
      fontSize: 14,
      color: currentColors.textSecondary,
    },
    adminNotes: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: settings.darkMode ? '#1a365d' : '#f0f8ff',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      gap: 8,
    },
    notesText: {
      flex: 1,
      fontSize: 12,
      color: currentColors.primary,
      lineHeight: 16,
    },
    contactText: {
      fontSize: 12,
      color: currentColors.textSecondary,
    },
    bookingId: {
      fontSize: 12,
      color: currentColors.textSecondary,
    },
    orderItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: currentColors.border,
    },
    orderId: {
      fontSize: 16,
      fontWeight: '600',
      color: currentColors.text,
      marginBottom: 4,
    },
    orderDate: {
      fontSize: 14,
      color: currentColors.textSecondary,
    },
    productItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: currentColors.background,
    },
    productName: {
      fontSize: 14,
      fontWeight: '500',
      color: currentColors.text,
      marginBottom: 4,
    },
    productPrice: {
      fontSize: 12,
      color: currentColors.textSecondary,
    },
    productTotal: {
      fontSize: 14,
      fontWeight: '600',
      color: currentColors.primary,
    },
    orderTotal: {
      fontSize: 16,
      fontWeight: 'bold',
      color: currentColors.text,
    },
    emptyStateText: {
      fontSize: 16,
      fontWeight: '600',
      color: currentColors.textSecondary,
      marginTop: 12,
      marginBottom: 4,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: currentColors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: currentColors.border,
    },
    menuTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: currentColors.text,
      marginBottom: 2,
    },
    menuSubtitle: {
      fontSize: 12,
      color: currentColors.textSecondary,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: currentColors.card,
      marginHorizontal: 20,
      marginTop: 24,
      marginBottom: 20,
      paddingVertical: 16,
      borderRadius: 16,
      elevation: 2,
      shadowColor: currentColors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
      color: currentColors.danger,
      marginLeft: 8,
    },
    versionContainer: {
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 20,
    },
    versionText: {
      fontSize: 12,
      color: currentColors.textSecondary,
      marginBottom: 4,
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    actionButton: {
      backgroundColor: currentColors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },
    actionButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    trackButton: {
      backgroundColor: currentColors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    trackButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
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
    bookingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    serviceInfo: {
      flex: 1,
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
    bookingFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
    orderProducts: {
      marginBottom: 12,
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
    orderFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
    },
  }), [currentColors, settings.darkMode]);

  // Original checkUser function
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

  const handleSettingToggle = async (setting) => {
    const newValue = !settings[setting];
    setSettings(prev => ({
      ...prev,
      [setting]: newValue
    }));
    
    // Save dark mode preference to AsyncStorage
    if (setting === 'darkMode') {
      try {
        await AsyncStorage.setItem('darkMode', JSON.stringify(newValue));
      } catch (error) {
        console.log('Error saving dark mode preference:', error);
      }
    }
    
    const settingNames = {
      notifications: 'Push Notifications',
      darkMode: 'Dark Mode',
      locationServices: 'Location Services'
    };
    
    Alert.alert(
      'Settings Updated',
      `${settingNames[setting]} ${newValue ? 'enabled' : 'disabled'}`
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
      case 'completed': return currentColors.success;
      case 'pending': return currentColors.warning;
      case 'cancelled': return currentColors.danger;
      default: return currentColors.textSecondary;
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

  // Format currency for payment history
  const formatCurrency = (amount) => {
    return `₱${Number(amount || 0).toLocaleString()}`;
  };

  // Function to generate sample payment history data
  const getPaymentHistory = () => {
    const payments = [];
    
    // Add completed orders as payment history
    orders.forEach(order => {
      if (order.status === 'completed' || order.status === 'approved') {
        payments.push({
          id: `payment_${order.id}`,
          type: 'Product Purchase',
          amount: order.total_amount || 0,
          date: order.created_at,
          status: 'Paid',
          orderId: order.id,
          method: 'Credit Card'
        });
      }
    });
    
    // Add completed bookings as payment history
    bookings.forEach(booking => {
      if (booking.status === 'completed' || booking.status === 'approved') {
        // Assuming booking has a price field, adjust if needed
        const bookingAmount = booking.price || booking.total_amount || 500; // Default amount
        payments.push({
          id: `payment_${booking.id}`,
          type: `Service: ${booking.service || 'Pool Service'}`,
          amount: bookingAmount,
          date: booking.date || booking.created_at,
          status: 'Paid',
          bookingId: booking.id,
          method: booking.payment_method || 'Cash'
        });
      }
    });
    
    // Sort by date (newest first)
    return payments.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const PaymentHistoryItem = ({ payment }) => (
    <View style={[dynamicStyles.menuItem, { borderBottomWidth: 0, marginVertical: 4 }]}>
      <View style={dynamicStyles.menuItemLeft}>
        <View style={[dynamicStyles.menuIconContainer, { 
          backgroundColor: payment.status === 'Paid' ? '#10B98120' : '#F59E0B20' 
        }]}>
          <Ionicons 
            name={payment.status === 'Paid' ? 'checkmark-circle' : 'time'} 
            size={22} 
            color={payment.status === 'Paid' ? '#10B981' : '#F59E0B'} 
          />
        </View>
        <View style={dynamicStyles.menuTextContainer}>
          <Text style={dynamicStyles.menuTitle}>{payment.type}</Text>
          <Text style={dynamicStyles.menuSubtitle}>
            {formatDate(payment.date)} • {payment.method}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[dynamicStyles.menuTitle, { color: currentColors.primary }]}>
          {formatCurrency(payment.amount)}
        </Text>
        <View style={[
          dynamicStyles.statusBadge, 
          { 
            backgroundColor: payment.status === 'Paid' ? '#10B98120' : '#F59E0B20',
            marginTop: 4
          }
        ]}>
          <Text style={[
            dynamicStyles.statusText, 
            { color: payment.status === 'Paid' ? '#10B981' : '#F59E0B' }
          ]}>
            {payment.status}
          </Text>
        </View>
      </View>
    </View>
  );

  const BookingItem = ({ booking }) => (
    <View style={dynamicStyles.bookingItem}>
      <View style={dynamicStyles.bookingHeader}>
        <View style={dynamicStyles.serviceInfo}>
          <Text style={dynamicStyles.serviceName}>{booking.service || 'Unknown Service'}</Text>
          <Text style={dynamicStyles.bookingDate}>
            {formatDate(booking.date)} • {booking.time || 'Time TBD'}
          </Text>
        </View>
        <View style={[dynamicStyles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
          <Ionicons name={getStatusIcon(booking.status)} size={14} color={getStatusColor(booking.status)} />
          <Text style={[dynamicStyles.statusText, { color: getStatusColor(booking.status) }]}>
            {booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : 'Pending'}
          </Text>
        </View>
      </View>
      
      {booking.admin_notes && (
        <View style={dynamicStyles.adminNotes}>
          <Ionicons name="information-circle" size={16} color={currentColors.primary} />
          <Text style={dynamicStyles.notesText}>{booking.admin_notes}</Text>
        </View>
      )}
      
      <View style={dynamicStyles.bookingFooter}>
        <Text style={dynamicStyles.contactText}>Contact: {booking.contact || 'Not provided'}</Text>
        <Text style={dynamicStyles.bookingId}>ID: {booking.id}</Text>
      </View>
    </View>
  );

  const OrderItem = ({ order }) => (
    <View style={dynamicStyles.orderItem}>
      <View style={dynamicStyles.orderHeader}>
        <View style={dynamicStyles.orderInfo}>
          <Text style={dynamicStyles.orderId}>Order #{order.id}</Text>
          <Text style={dynamicStyles.orderDate}>{formatDate(order.created_at)}</Text>
        </View>
        <View style={[dynamicStyles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
          <Ionicons name={getStatusIcon(order.status)} size={14} color={getStatusColor(order.status)} />
          <Text style={[dynamicStyles.statusText, { color: getStatusColor(order.status) }]}>
            {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending'}
          </Text>
        </View>
      </View>

      <View style={dynamicStyles.orderProducts}>
        {order.order_items?.map((item, index) => (
          <View key={item.id} style={dynamicStyles.productItem}>
            <Image
              source={{ uri: item.products?.image_url || 'https://images.unsplash.com/photo-1566014633661-349c6fae61e9?w=400' }}
              style={dynamicStyles.productImage}
            />
            <View style={dynamicStyles.productDetails}>
              <Text style={dynamicStyles.productName} numberOfLines={2}>
                {item.products?.name || 'Unknown Product'}
              </Text>
              <Text style={dynamicStyles.productPrice}>
                ₱{Number(item.price || 0).toLocaleString()} x {item.quantity || 1}
              </Text>
            </View>
            <Text style={dynamicStyles.productTotal}>
              ₱{Number((item.price || 0) * (item.quantity || 1)).toLocaleString()}
            </Text>
          </View>
        ))}
      </View>

      <View style={dynamicStyles.orderFooter}>
        <Text style={dynamicStyles.orderTotal}>Total: ₱{Number(order.total_amount || 0).toLocaleString()}</Text>
        <TouchableOpacity 
          style={dynamicStyles.trackButton}
          onPress={() => Alert.alert('Pickup Information', 'Your order is ready for pickup at our store!\n\n📍 123 Tropical Lane, Paradise City\n📞 (555) 123-POOL')}
        >
          <Text style={dynamicStyles.trackButtonText}>Pickup Info</Text>
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
      style={dynamicStyles.menuItem} 
      onPress={onPress}
      disabled={isSwitch}
    >
      <View style={dynamicStyles.menuItemLeft}>
        <View style={[dynamicStyles.menuIconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={dynamicStyles.menuTextContainer}>
          <Text style={dynamicStyles.menuTitle}>{title}</Text>
          {subtitle && <Text style={dynamicStyles.menuSubtitle}>{subtitle}</Text>}
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
    <View style={dynamicStyles.section}>
      <Text style={dynamicStyles.sectionTitle}>{title}</Text>
      <View style={dynamicStyles.sectionContent}>
        {children}
      </View>
    </View>
  );

  // In the JSX, update the LinearGradient to use dynamic colors:
  const gradientColors = settings.darkMode 
    ? currentColors.gradient 
    : ['#4ab8ebff', '#2e4dc8ff'];

  if (loading) {
    return (
      <View style={dynamicStyles.centered}>
        <ActivityIndicator size="large" color={currentColors.primary} />
        <Text style={dynamicStyles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={dynamicStyles.centered}>
        <Ionicons name="person-circle-outline" size={80} color={currentColors.primary} />
        <Text style={dynamicStyles.loginTitle}>Welcome to Tropics Pools!</Text>
        <Text style={dynamicStyles.loginSubtitle}>Please login to view your profile and orders</Text>
        <TouchableOpacity 
          style={[styles.loginButton, { backgroundColor: currentColors.primary }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Login to Your Account</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.signupButton, { borderColor: currentColors.primary }]}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={[styles.signupButtonText, { color: currentColors.primary }]}>
            Create New Account
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get payment history data
  const paymentHistory = getPaymentHistory();

  return (
    <View style={dynamicStyles.container}>
      <ScrollView 
        style={dynamicStyles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[currentColors.primary]}
            tintColor={currentColors.primary}
            progressBackgroundColor={currentColors.card}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Profile Info */}
        <LinearGradient
          colors={gradientColors}
          style={dynamicStyles.header}
        >
          <View style={dynamicStyles.profileHeader}>
            <View style={dynamicStyles.avatarContainer}>
              <View style={dynamicStyles.avatarPlaceholder}>
                <Text style={dynamicStyles.avatarText}>
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            </View>
            
            <Text style={dynamicStyles.userName}>
              {user?.full_name || 'User'}
            </Text>
            <Text style={dynamicStyles.userEmail}>
              {user?.email || 'No email'}
            </Text>
          </View>
        </LinearGradient>

        {/* Quick Stats */}
        <View style={dynamicStyles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={dynamicStyles.statNumber}>{orders.length}</Text>
            <Text style={dynamicStyles.statLabel}>Orders</Text>
          </View>
          <View style={dynamicStyles.statDivider} />
          <View style={styles.statItem}>
            <Text style={dynamicStyles.statNumber}>
              {bookings.length}
            </Text>
            <Text style={dynamicStyles.statLabel}>Bookings</Text>
          </View>
          <View style={dynamicStyles.statDivider} />
          <View style={styles.statItem}>
            <Text style={dynamicStyles.statNumber}>
              {paymentHistory.length}
            </Text>
            <Text style={dynamicStyles.statLabel}>Payments</Text>
          </View>
        </View>

        {/* My Orders & Bookings Section */}
        <ProfileSection title="My Orders & Bookings">
          {/* Tab Navigation */}
          <View style={dynamicStyles.tabContainer}>
            <TouchableOpacity 
              style={[dynamicStyles.tab, activeTab === 'bookings' && dynamicStyles.activeTab]}
              onPress={() => setActiveTab('bookings')}
            >
              <Text style={[dynamicStyles.tabText, activeTab === 'bookings' && dynamicStyles.activeTabText]}>
                Service Bookings ({bookings.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[dynamicStyles.tab, activeTab === 'orders' && dynamicStyles.activeTab]}
              onPress={() => setActiveTab('orders')}
            >
              <Text style={[dynamicStyles.tabText, activeTab === 'orders' && dynamicStyles.activeTabText]}>
                Product Orders ({orders.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content based on active tab */}
          {activeTab === 'bookings' ? (
            bookingsLoading ? (
              <View style={dynamicStyles.loadingContainer}>
                <ActivityIndicator size="small" color={currentColors.primary} />
                <Text style={dynamicStyles.loadingText}>Loading bookings...</Text>
              </View>
            ) : bookings.length > 0 ? (
              bookings.map((booking) => (
                <BookingItem key={booking.id} booking={booking} />
              ))
            ) : (
              <View style={dynamicStyles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color="#ccc" />
                <Text style={dynamicStyles.emptyStateText}>No service bookings yet</Text>
                <Text style={dynamicStyles.emptyStateSubtext}>
                  Book a service to see your appointments here
                </Text>
                <TouchableOpacity 
                  style={dynamicStyles.actionButton}
                  onPress={() => navigation.navigate('Booking')}
                >
                  <Text style={dynamicStyles.actionButtonText}>Book a Service</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            ordersLoading ? (
              <View style={dynamicStyles.loadingContainer}>
                <ActivityIndicator size="small" color={currentColors.primary} />
                <Text style={dynamicStyles.loadingText}>Loading orders...</Text>
              </View>
            ) : orders.length > 0 ? (
              orders.map((order) => (
                <OrderItem key={order.id} order={order} />
              ))
            ) : (
              <View style={dynamicStyles.emptyState}>
                <Ionicons name="bag-outline" size={40} color="#ccc" />
                <Text style={dynamicStyles.emptyStateText}>No product orders yet</Text>
                <Text style={dynamicStyles.emptyStateSubtext}>
                  Purchase products to see your order history here
                </Text>
                <TouchableOpacity 
                  style={dynamicStyles.actionButton}
                  onPress={() => navigation.navigate('Categories')}
                >
                  <Text style={dynamicStyles.actionButtonText}>Shop Products</Text>
                </TouchableOpacity>
              </View>
            )
          )}
        </ProfileSection>

        {/* Payment History Section */}
        <ProfileSection title="Payment History">
          {paymentHistory.length > 0 ? (
            <View style={{ paddingVertical: 8 }}>
              {paymentHistory.map((payment) => (
                <PaymentHistoryItem key={payment.id} payment={payment} />
              ))}
            </View>
          ) : (
            <View style={[dynamicStyles.emptyState, { padding: 20 }]}>
              <Ionicons name="card-outline" size={40} color="#ccc" />
              <Text style={dynamicStyles.emptyStateText}>No payment history</Text>
              <Text style={dynamicStyles.emptyStateSubtext}>
                Your completed orders and bookings will appear here
              </Text>
            </View>
          )}
        </ProfileSection>

        {/* Account Section */}
        <ProfileSection title="Account">
          <MenuItem
            icon="receipt-outline"
            title="Payment History"
            subtitle="View all your past payments"
            onPress={() => {
              // Show payment history in a modal or navigate to a detailed screen
              if (paymentHistory.length > 0) {
                const totalSpent = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
                Alert.alert(
                  'Payment Summary',
                  `Total Payments: ${formatCurrency(totalSpent)}\nTransactions: ${paymentHistory.length}\n\nView detailed history in the Payment History section above.`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('No Payments', 'You have no payment history yet. Complete an order or booking to see payment details.', [{ text: 'OK' }]);
              }
            }}
          />
        </ProfileSection>

        {/* Preferences Section */}
        <ProfileSection title="Preferences">
          <MenuItem
            icon="moon-outline"
            title="Dark Mode"
            isSwitch={true}
            switchValue={settings.darkMode}
            onToggle={() => handleSettingToggle('darkMode')}
          />
        </ProfileSection>

        {/* Support Section */}
        <ProfileSection title="Support">
          <MenuItem
            icon="document-text-outline"
            title="Terms & Conditions"
            onPress={() => handleMenuPress('Terms & Conditions', 'Terms screen coming soon!')}
          />
          <MenuItem
            icon="information-circle-outline"
            title="About Us"
            onPress={() => handleMenuPress('About Us', 'Tropics Pools & Landscape - Creating paradise since 2010!')}
          />
        </ProfileSection>

        {/* Logout Button */}
        <TouchableOpacity 
          style={dynamicStyles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color={currentColors.danger} />
          <Text style={dynamicStyles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <View style={dynamicStyles.versionContainer}>
          <Text style={dynamicStyles.versionText}>Tropics Pools & Landscape</Text>
          <Text style={dynamicStyles.versionText}>Version 1.0.0</Text>
          <Text style={dynamicStyles.versionText}>
            Member since {new Date(user.created_at).getFullYear()}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Keep your existing static styles for properties that don't change with dark mode
const styles = StyleSheet.create({
  loginButton: {
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
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
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
});
