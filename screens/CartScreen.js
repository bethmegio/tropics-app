import { Ionicons } from '@expo/vector-icons';
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
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabaseClient';

const { width } = Dimensions.get('window');

export default function CartScreen({ navigation }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('gcash');
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    checkUser();
    loadCartItems();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        Alert.alert('Login Required', 'Please login to view your cart', [
          {
            text: 'Login',
            onPress: () => navigation.navigate('Login'),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const loadCartItems = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          products (
            id,
            name,
            price,
            image_url,
            category_id,
            description
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;

      const transformedCartItems = data.map(item => ({
        id: item.id,
        product_id: item.product_id,
        name: item.products?.name || 'Unknown Product',
        price: item.products?.price || 0,
        quantity: item.quantity,
        image_url: item.products?.image_url || 'https://images.unsplash.com/photo-1566014633661-349c6fae61e9?w=400',
        category: item.products?.category_id || 'General',
        description: item.products?.description || '',
        added_at: item.added_at
      }));

      setCartItems(transformedCartItems || []);
      
    } catch (error) {
      console.error('Error loading cart:', error);
      Alert.alert('Error', 'Failed to load cart items');
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCartItems();
    setRefreshing(false);
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      if (error) throw error;

      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update quantity');
    }
  };

  const removeFromCart = async (itemId) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('cart_items')
                .delete()
                .eq('id', itemId);

              if (error) throw error;
              setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
            } catch (error) {
              console.error('Error removing item:', error);
              Alert.alert('Error', 'Failed to remove item from cart');
            }
          }
        }
      ]
    );
  };

  const continueShopping = () => {
    navigation.navigate('Categories');
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal();
  };

  const renderCartItem = ({ item }) => (
    <Animated.View
      style={[
        styles.cartItem,
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
      <Image
        source={{ uri: item.image_url }}
        style={styles.itemImage}
      />
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemCategory}>{item.category || 'General'}</Text>
        <Text style={styles.itemPrice}>₱{Number(item.price).toLocaleString()}</Text>
        
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
          >
            <Ionicons name="remove-outline" size={16} color="#333" />
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
          >
            <Ionicons name="add-outline" size={16} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.itemActions}>
        <Text style={styles.itemTotal}>
          ₱{Number(item.price * item.quantity).toLocaleString()}
        </Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BFFF" />
        <Text style={styles.loadingText}>Loading Your Cart...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <Text style={styles.headerSubtitle}>Please login to view your cart</Text>
        </View>
        <View style={styles.emptyCart}>
          <Ionicons name="log-in-outline" size={100} color="#ccc" />
          <Text style={styles.emptyCartTitle}>Login Required</Text>
          <Text style={styles.emptyCartText}>
            Please login to view and manage your shopping cart
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={styles.shopButtonText}>Login Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Shopping Cart</Text>
            <Text style={styles.headerSubtitle}>Your cart is empty</Text>
          </View>
        </View>
        
        <View style={styles.emptyCart}>
          <Ionicons name="cart-outline" size={100} color="#ccc" />
          <Text style={styles.emptyCartTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptyCartText}>
            Add some amazing plants and accessories to your cart!
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={continueShopping}
          >
            <Ionicons name="leaf-outline" size={20} color="#fff" />
            <Text style={styles.shopButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <Text style={styles.headerSubtitle}>{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in cart</Text>
        </View>
        {cartItems.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              Alert.alert(
                'Clear Cart',
                'Are you sure you want to remove all items from your cart?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                          const { error } = await supabase
                            .from('cart_items')
                            .delete()
                            .eq('user_id', user.id);
                          
                          if (error) throw error;
                          setCartItems([]);
                        }
                      } catch (error) {
                        console.error('Error clearing cart:', error);
                        Alert.alert('Error', 'Failed to clear cart');
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00BFFF"]} />
        }
      >
        {/* Cart Items List */}
        <View style={styles.cartList}>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Order Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})</Text>
            <Text style={styles.summaryValue}>₱{Number(calculateSubtotal()).toLocaleString()}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>₱0.00</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>₱0.00</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{Number(calculateTotal()).toLocaleString()}</Text>
          </View>

          {/* Pickup Info */}
          <View style={styles.pickupInfo}>
            <Ionicons name="information-circle-outline" size={20} color="#0077b6" />
            <View style={styles.pickupTextContainer}>
              <Text style={styles.pickupTitle}>Store Pickup Only</Text>
              <Text style={styles.pickupDescription}>
                All items are available for store pickup only. Please visit our store to collect your order.
              </Text>
            </View>
          </View>
        </View>

        {/* Store Info */}
        <View style={styles.storeSection}>
          <Text style={styles.sectionTitle}>Store Pickup Location</Text>
          <View style={styles.storeInfo}>
            <View style={styles.storeDetail}>
              <Ionicons name="location-outline" size={16} color="#0077b6" />
              <Text style={styles.storeText}>
                Purok Bougainvillea, Dumaguete City, 6200 Negros Oriental
              </Text>
            </View>
            <View style={styles.storeDetail}>
              <Ionicons name="time-outline" size={16} color="#0077b6" />
              <Text style={styles.storeText}>Mon-Sun: 7:00 AM - 7:00 PM</Text>
            </View>
            <View style={styles.storeDetail}>
              <Ionicons name="call-outline" size={16} color="#0077b6" />
              <Text style={styles.storeText}>0915 736 2648</Text>
            </View>
          </View>
        </View>

        {/* Payment Method Section */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          {/* GCash Option */}
          <TouchableOpacity 
            style={[
              styles.paymentOption,
              selectedPaymentMethod === 'gcash' && styles.paymentOptionSelected
            ]}
            onPress={() => setSelectedPaymentMethod('gcash')}
          >
            <View style={styles.paymentOptionLeft}>
              <View style={[styles.paymentIconContainer, { backgroundColor: '#0078b5' }]}>
                <Ionicons name="wallet-outline" size={24} color="#fff" />
              </View>
              <View>
                <Text style={styles.paymentOptionTitle}>GCash</Text>
                <Text style={styles.paymentOptionSubtitle}>Pay via GCash mobile wallet</Text>
              </View>
            </View>
            <View style={styles.paymentOptionRight}>
              {selectedPaymentMethod === 'gcash' ? (
                <Ionicons name="checkmark-circle" size={24} color="#00BFFF" />
              ) : (
                <Ionicons name="ellipse-outline" size={24} color="#ccc" />
              )}
            </View>
          </TouchableOpacity>
          
          {/* Cash on Pickup Option */}
          <TouchableOpacity 
            style={[
              styles.paymentOption,
              selectedPaymentMethod === 'cash' && styles.paymentOptionSelected
            ]}
            onPress={() => setSelectedPaymentMethod('cash')}
          >
            <View style={styles.paymentOptionLeft}>
              <View style={[styles.paymentIconContainer, { backgroundColor: '#28a745' }]}>
                <Ionicons name="cash-outline" size={24} color="#fff" />
              </View>
              <View>
                <Text style={styles.paymentOptionTitle}>Cash on Pickup</Text>
                <Text style={styles.paymentOptionSubtitle}>Pay at our store when you collect</Text>
              </View>
            </View>
            <View style={styles.paymentOptionRight}>
              {selectedPaymentMethod === 'cash' ? (
                <Ionicons name="checkmark-circle" size={24} color="#00BFFF" />
              ) : (
                <Ionicons name="ellipse-outline" size={24} color="#ccc" />
              )}
            </View>
          </TouchableOpacity>
          
          {/* GCash Instructions */}
          {selectedPaymentMethod === 'gcash' && (
            <View style={styles.gcashInstructions}>
              <View style={styles.gcashHeader}>
                <Ionicons name="information-circle" size={18} color="#0078b5" />
                <Text style={styles.gcashHeaderText}>GCash Payment Instructions</Text>
              </View>
              <Text style={styles.gcashText}>1. Open GCash app and tap "Send Money"</Text>
              <Text style={styles.gcashText}>2. Enter our GCash number: <Text style={styles.gcashNumber}>0915 736 2648</Text></Text>
              <Text style={styles.gcashText}>3. Enter amount: ₱{Number(calculateTotal()).toLocaleString()}</Text>
              <Text style={styles.gcashText}>4. Send payment and save your reference number</Text>
              <Text style={styles.gcashText}>5. Show your GCash receipt when picking up your order</Text>
            </View>
          )}
        </View>

        {/* Checkout Button */}
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => {
            if (selectedPaymentMethod === 'gcash') {
              Alert.alert(
                'GCash Payment',
                `Please send ₱${Number(calculateTotal()).toLocaleString()} to our GCash: 0915 736 2648\n\nAfter payment, show your GCash receipt at pickup.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Confirm Order', 
                    onPress: () => {
                      Alert.alert('Order Placed!', 'Your order has been placed. Please visit our store with your GCash receipt for pickup.');
                      setCartItems([]);
                    }
                  }
                ]
              );
            } else {
              Alert.alert(
                'Checkout',
                `Your total is ₱${Number(calculateTotal()).toLocaleString()}. Pay at pickup.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Proceed',
                    onPress: () => {
                      Alert.alert('Success', 'Your order has been placed! Please visit our store for pickup.');
                      setCartItems([]);
                    }
                  }
                ]
              );
            }
          }}
        >
          <View style={[styles.checkoutGradient, { backgroundColor: '#00BFFF' }]}>
            <Ionicons name="cart" size={24} color="#fff" />
            <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            <Text style={styles.checkoutPrice}>₱{Number(calculateTotal()).toLocaleString()}</Text>
          </View>
        </TouchableOpacity>

        {/* Continue Shopping Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={continueShopping}
        >
          <Ionicons name="arrow-back-outline" size={20} color="#00BFFF" />
          <Text style={styles.continueButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#00BFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
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
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyCartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyCartText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00BFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cartList: {
    padding: 20,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00BFFF',
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 15,
    minWidth: 20,
    textAlign: 'center',
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  removeButton: {
    padding: 4,
  },
  summarySection: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00BFFF',
  },
  pickupInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  pickupTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  pickupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0077b6',
    marginBottom: 2,
  },
  pickupDescription: {
    fontSize: 12,
    color: '#0077b6',
    lineHeight: 16,
  },
  storeSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
  },
  storeInfo: {
    gap: 8,
  },
  storeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  checkoutButton: {
    margin: 20,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
  },
  checkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  checkoutPrice: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    margin: 20,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  continueButtonText: {
    color: '#00BFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Payment Method Styles
  paymentSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    marginBottom: 10,
  },
  paymentOptionSelected: {
    borderColor: '#00BFFF',
    backgroundColor: '#f0f8ff',
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentOptionRight: {
    marginLeft: 10,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  paymentOptionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  gcashInstructions: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  gcashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  gcashHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0078b5',
    marginLeft: 8,
  },
  gcashText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 6,
    lineHeight: 18,
  },
  gcashNumber: {
    fontWeight: '700',
    color: '#0078b5',
  },
});