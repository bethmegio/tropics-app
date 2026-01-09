import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabaseClient";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ProductDetails({ navigation, route }) {
  const { product } = route.params;
  const [loading, setLoading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [user, setUser] = useState(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Mock multiple images for demonstration
  const productImages = [
    product.image_url || "https://images.unsplash.com/photo-1566014633661-349c6fae61e9?w=800",
    "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800",
    "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800",
  ];

  useEffect(() => {
    checkUser();
    loadRelatedProducts();
    loadReviews();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error("Error checking user:", error);
    }
  };

  const loadRelatedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", product.category_id)
        .neq("id", product.id)
        .limit(4);

      if (error) throw error;
      setRelatedProducts(data || []);
    } catch (error) {
      console.error("Error loading related products:", error);
    }
  };

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false });

      if (error) {
        // Table doesn't exist - using mock reviews as fallback
        setReviews([
          {
            id: 1,
            rating: 5,
            comment: "Excellent product! Exactly as described and arrived quickly.",
            user_name: "John D.",
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            rating: 4,
            comment: "Good quality for the price. Would recommend.",
            user_name: "Maria S.",
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: 3,
            rating: 5,
            comment: "Perfect for my pool setup. Very satisfied!",
            user_name: "Robert M.",
            created_at: new Date(Date.now() - 172800000).toISOString(),
          },
        ]);
        return;
      }
      
      // Transform reviews with user info
      const reviewsWithUsers = await Promise.all(
        (data || []).map(async (review) => {
          let userName = "Anonymous";
          if (review.user_id) {
            const { data: userData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", review.user_id)
              .single();
            if (userData) {
              userName = userData.full_name;
            }
          }
          return { ...review, user_name: userName };
        })
      );
      
      setReviews(reviewsWithUsers);
    } catch (error) {
      // Use mock reviews as fallback
      setReviews([
        {
          id: 1,
          rating: 5,
          comment: "Excellent product! Exactly as described and arrived quickly.",
          user_name: "John D.",
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          rating: 4,
          comment: "Good quality for the price. Would recommend.",
          user_name: "Maria S.",
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 3,
          rating: 5,
          comment: "Perfect for my pool setup. Very satisfied!",
          user_name: "Robert M.",
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
      ]);
    }
  };

  const submitReview = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please login to leave a review", [
        { text: "Login", onPress: () => navigation.navigate("Login") },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }

    if (!newReview.comment.trim()) {
      Alert.alert("Error", "Please enter a review comment");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from("reviews").insert({
        product_id: product.id,
        user_id: user.id,
        rating: newReview.rating,
        comment: newReview.comment.trim(),
      });

      if (error) {
        // Table doesn't exist - add review locally as fallback
        const localReview = {
          id: Date.now(),
          product_id: product.id,
          rating: newReview.rating,
          comment: newReview.comment.trim(),
          user_name: user?.email?.split("@")[0] || "You",
          created_at: new Date().toISOString(),
        };
        setReviews([localReview, ...reviews]);
        setNewReview({ rating: 5, comment: "" });
        setShowReviewForm(false);
        Alert.alert("Success", "Thank you for your review!");
        return;
      }

      Alert.alert("Success", "Thank you for your review!");
      setNewReview({ rating: 5, comment: "" });
      setShowReviewForm(false);
      loadReviews();
    } catch (error) {
      // Add review locally as fallback
      const localReview = {
        id: Date.now(),
        product_id: product.id,
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        user_name: user?.email?.split("@")[0] || "You",
        created_at: new Date().toISOString(),
      };
      setReviews([localReview, ...reviews]);
      setNewReview({ rating: 5, comment: "" });
      setShowReviewForm(false);
      Alert.alert("Success", "Thank you for your review!");
    } finally {
      setLoading(false);
    }
  };

  // Add to Cart function
  const addToCart = async () => {
    try {
      setAddingToCart(true);
      
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
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);

        if (error) throw error;
        Alert.alert('Success', `Added ${quantity} more to cart!`);
      } else {
        // Add new item to cart
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity: quantity,
          });

        if (error) throw error;
        Alert.alert('Success', `Product added to cart!`);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add product to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    Alert.alert(
      `Buy ${product.name}`,
      `Proceed to checkout with ${quantity} x ${product.name}?`,
      [
        {
          text: 'Add to Cart First',
          onPress: addToCart,
        },
        { 
          text: 'Continue', 
          style: 'default',
          onPress: () => {
            addToCart().then(() => {
              navigation.navigate('Cart');
            });
          }
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${product.name} from Tropics Pools & Landscape! ${product.description}`,
        url: product.image_url,
        title: product.name,
      });
    } catch (error) {
      Alert.alert("Error", "Unable to share product");
    }
  };

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    // Here you would typically update favorite status in your database
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  const renderImageIndicator = () => (
    <View style={styles.imageIndicator}>
      {productImages.map((_, index) => (
        <View
          key={index}
          style={[
            styles.indicatorDot,
            activeImageIndex === index && styles.activeIndicatorDot,
          ]}
        />
      ))}
    </View>
  );

  const renderStarRating = (rating, interactive = false, onRatingChange = null) => (
    <View style={styles.starRating}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => interactive && onRatingChange && onRatingChange(star)}
          disabled={!interactive}
        >
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={interactive ? 28 : 16}
            color={star <= rating ? "#FFD700" : "#ccc"}
            style={interactive && styles.interactiveStar}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewUserInfo}>
          <View style={styles.reviewAvatar}>
            <Text style={styles.reviewAvatarText}>
              {item.user_name?.charAt(0)?.toUpperCase() || "A"}
            </Text>
          </View>
          <View>
            <Text style={styles.reviewUserName}>{item.user_name}</Text>
            <Text style={styles.reviewDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
        {renderStarRating(item.rating)}
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleFavorite}>
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? "#FF6B6B" : "#333"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Product Images Carousel */}
        <View style={styles.imageSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(
                event.nativeEvent.contentOffset.x / SCREEN_WIDTH
              );
              setActiveImageIndex(newIndex);
            }}
          >
            {productImages.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          {renderImageIndicator()}
          
          {/* Featured Badge */}
          {product.is_featured && (
            <View style={styles.featuredTag}>
              <Text style={styles.featuredTagText}>Featured</Text>
            </View>
          )}
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Product Info */}
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productPrice}>
              ₱ {Number(product.price || 0).toLocaleString()}
            </Text>
          </View>

          <Text style={styles.productDescription}>
            {product.description || "Premium quality product designed for tropical environments. Built to withstand harsh weather conditions while maintaining optimal performance."}
          </Text>

          {/* Product Features */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Key Features</Text>
            <View style={styles.featuresGrid}>
              <View style={styles.featureItem}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#00BFFF" />
                <Text style={styles.featureText}>Weather Resistant</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="time-outline" size={20} color="#00BFFF" />
                <Text style={styles.featureText}>Long Lasting</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="leaf-outline" size={20} color="#00BFFF" />
                <Text style={styles.featureText}>Eco Friendly</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="build-outline" size={20} color="#00BFFF" />
                <Text style={styles.featureText}>Easy Installation</Text>
              </View>
            </View>
          </View>

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={decrementQuantity}
                disabled={quantity <= 1}
              >
                <Ionicons name="remove" size={20} color={quantity <= 1 ? "#ccc" : "#333"} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={incrementQuantity}
              >
                <Ionicons name="add" size={20} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.button, styles.cartButton]}
              onPress={addToCart}
              disabled={addingToCart}
            >
              {addingToCart ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="cart-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Add to Cart</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.buyButton]}
              onPress={handleBuyNow}
            >
              <Ionicons name="flash-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Buy Now</Text>
            </TouchableOpacity>
          </View>

          {/* Product Specifications */}
          <View style={styles.specsSection}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            <View style={styles.specsList}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Category</Text>
                <Text style={styles.specValue}>{product.category || "General"}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Material</Text>
                <Text style={styles.specValue}>Premium Quality</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Warranty</Text>
                <Text style={styles.specValue}>2 Years</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Delivery</Text>
                <Text style={styles.specValue}>3-5 Business Days</Text>
              </View>
            </View>
          </View>

          {/* Reviews Section */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Customer Reviews</Text>
              <View style={styles.reviewsSummary}>
                <Text style={styles.averageRating}>{calculateAverageRating()}</Text>
                <View style={styles.ratingSummary}>
                  {renderStarRating(Math.round(parseFloat(calculateAverageRating())))}
                  <Text style={styles.reviewCount}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            </View>

            {/* Add Review Button */}
            <TouchableOpacity 
              style={styles.addReviewButton}
              onPress={() => setShowReviewForm(!showReviewForm)}
            >
              <Ionicons name="create-outline" size={18} color="#00BFFF" />
              <Text style={styles.addReviewButtonText}>
                {showReviewForm ? "Cancel Review" : "Write a Review"}
              </Text>
            </TouchableOpacity>

            {/* Review Form */}
            {showReviewForm && (
              <View style={styles.reviewForm}>
                <Text style={styles.reviewFormTitle}>Your Rating</Text>
                {renderStarRating(newReview.rating, true, (rating) => 
                  setNewReview({ ...newReview, rating })
                )}
                
                <Text style={styles.reviewFormTitle}>Your Review</Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Share your experience with this product..."
                  placeholderTextColor="#999"
                  value={newReview.comment}
                  onChangeText={(text) => setNewReview({ ...newReview, comment: text })}
                  multiline
                  numberOfLines={4}
                />
                
                <TouchableOpacity 
                  style={styles.submitReviewButton}
                  onPress={submitReview}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={18} color="#fff" />
                      <Text style={styles.submitReviewButtonText}>Submit Review</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Reviews List */}
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUserInfo}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>
                          {review.user_name?.charAt(0)?.toUpperCase() || "A"}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.reviewUserName}>{review.user_name}</Text>
                        <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                      </View>
                    </View>
                    {renderStarRating(review.rating)}
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))
            ) : (
              <View style={styles.noReviews}>
                <Ionicons name="chatbubble-outline" size={40} color="#ccc" />
                <Text style={styles.noReviewsText}>No reviews yet</Text>
                <Text style={styles.noReviewsSubtext}>Be the first to review this product</Text>
              </View>
            )}
          </View>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionTitle}>Related Products</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.relatedProductsList}
              >
                {relatedProducts.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.relatedProductCard}
                    onPress={() => navigation.replace("ProductDetails", { product: item })}
                  >
                    <Image
                      source={{ uri: item.image_url || "https://images.unsplash.com/photo-1566014633661-349c6fae61e9?w=400" }}
                      style={styles.relatedProductImage}
                    />
                    <Text style={styles.relatedProductName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.relatedProductPrice}>
                      ₱ {Number(item.price || 0).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  headerActions: {
    flexDirection: "row",
  },
  iconButton: {
    padding: 5,
    marginLeft: 15,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  imageSection: {
    position: "relative",
  },
  productImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.8,
  },
  imageIndicator: {
    flexDirection: "row",
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginHorizontal: 4,
  },
  activeIndicatorDot: {
    backgroundColor: "#fff",
    width: 20,
  },
  featuredTag: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "#FFD700",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  featuredTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },
  content: {
    padding: 20,
  },
  productHeader: {
    marginBottom: 15,
  },
  productName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: "700",
    color: "#00BFFF",
  },
  productDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: "#666",
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 15,
  },
  featuresSection: {
    marginBottom: 25,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  featureText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  quantitySection: {
    marginBottom: 25,
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 8,
    alignSelf: "flex-start",
  },
  quantityButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "600",
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    marginBottom: 30,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  cartButton: {
    backgroundColor: "#00BFFF",
  },
  buyButton: {
    backgroundColor: "#32CD32",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  specsSection: {
    marginBottom: 25,
  },
  specsList: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
  },
  specItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  specItemLast: {
    borderBottomWidth: 0,
  },
  specLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  specValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  // Reviews Styles
  reviewsSection: {
    marginBottom: 25,
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  reviewsSummary: {
    flexDirection: "row",
    alignItems: "center",
  },
  averageRating: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginRight: 8,
  },
  ratingSummary: {
    alignItems: "flex-start",
  },
  reviewCount: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  starRating: {
    flexDirection: "row",
  },
  interactiveStar: {
    marginHorizontal: 2,
  },
  addReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#00BFFF",
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  addReviewButtonText: {
    color: "#00BFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  reviewForm: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  reviewFormTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
    marginTop: 5,
  },
  reviewInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    textAlignVertical: "top",
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  submitReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00BFFF",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  submitReviewButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  reviewItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  reviewUserInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00BFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  reviewAvatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  reviewDate: {
    fontSize: 12,
    color: "#999",
  },
  reviewComment: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  noReviews: {
    alignItems: "center",
    padding: 30,
  },
  noReviewsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 10,
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  relatedSection: {
    marginBottom: 20,
  },
  relatedProductsList: {
    paddingRight: 20,
  },
  relatedProductCard: {
    width: 150,
    marginRight: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  relatedProductImage: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  relatedProductName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    lineHeight: 16,
  },
  relatedProductPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00BFFF",
  },
});
