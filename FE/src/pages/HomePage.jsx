import { useState } from 'react';
import MainHeader from '../components/layout/MainHeader';
import '../style/HomePage.css';

const HomePage = () => {
  const [bookingForm, setBookingForm] = useState({
    date: '',
    time: '',
    people: 1
  });

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    console.log('Booking:', bookingForm);
    alert('Đặt lịch thành công!');
  };

  return (
    <div className="homepage">
      {/* Header Navigation */}
      <MainHeader />

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-badge">PREMIUM NHAT BINH</div>
          <h2 className="hero-title">Royal Elegance in Ancient Town</h2>
          <p className="hero-subtitle">Experience the nobility of the past with our handcrafted Nhat Binh collection.</p>
          <div className="hero-actions">
            <button className="btn-primary">Book Fitting</button>
            <button className="btn-secondary">Learn More</button>
          </div>
          <div className="hero-promo">10% OFF FAMILY COMBO</div>
        </div>
      </section>

      {/* Rental Principles */}
      <section className="principles">
        <div className="container">
          <h2 className="section-title">Rental Principles</h2>
          <p className="section-subtitle">Transparent – Clear – Supporting Tourists</p>
          <div className="principles-grid">
            <div className="principle-card">
              <h3>Deposit 50%</h3>
              <p>Book online to secure your date & outfit set.</p>
            </div>
            <div className="principle-card">
              <h3>Pay on Arrival</h3>
              <p>Pay the remaining 50% when you pick up.</p>
            </div>
            <div className="principle-card">
              <h3>Flexible Deposit</h3>
              <p>Leave ID/Passport or cash deposit.</p>
            </div>
            <div className="principle-card">
              <h3>Late Fee Policy</h3>
              <p>Late returns &gt;3 days incur extra fees.</p>
            </div>
            <div className="principle-card">
              <h3>Size Exchange</h3>
              <p>Flexible exchange based on availability.</p>
            </div>
            <div className="principle-card">
              <h3>Damage Policy</h3>
              <p>Compensation based on item value.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collections */}
      <section className="collections">
        <div className="container">
          <h2 className="section-title">Featured Collections</h2>
          <div className="collections-grid">
            <div className="collection-card">
              <div className="collection-image" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}></div>
              <h3>Ao Dai for Women</h3>
              <button className="btn-link">View Collection</button>
            </div>
            <div className="collection-card">
              <div className="collection-image" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}></div>
              <h3>Viet Phuc / Nhat Binh</h3>
              <button className="btn-link">View Collection</button>
            </div>
            <div className="collection-card">
              <div className="collection-image" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}></div>
              <h3>Men's Costumes</h3>
              <button className="btn-link">View Collection</button>
            </div>
            <div className="collection-card">
              <div className="collection-image" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}></div>
              <h3>Accessories</h3>
              <button className="btn-link">View Collection</button>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Rentals */}
      <section className="products">
        <div className="container">
          <h2 className="section-title">Trending Rentals</h2>
          <p className="section-subtitle">Curated selection for your journey.</p>
          <div className="products-grid">
            <div className="product-card">
              <div className="product-badge best-seller">BEST SELLER</div>
              <div className="product-image" style={{ background: '#ff6b6b' }}></div>
              <div className="product-info">
                <h3>Silk Ao Dai - Red Lotus</h3>
                <p className="price">$15/day</p>
                <p className="sizes">S-XL</p>
                <button className="btn-primary">Rent Now</button>
              </div>
            </div>
            <div className="product-card">
              <div className="product-badge new">NEW</div>
              <div className="product-image" style={{ background: '#feca57' }}></div>
              <div className="product-info">
                <h3>Vintage Floral Ao Dai</h3>
                <p className="price">$12/day</p>
                <p className="sizes">S-XL</p>
                <button className="btn-primary">Rent Now</button>
              </div>
            </div>
            <div className="product-card">
              <div className="product-image" style={{ background: '#48dbfb' }}></div>
              <div className="product-info">
                <h3>Royal Nhat Binh - Blue</h3>
                <p className="price">$35/day</p>
                <p className="sizes">S-XL</p>
                <button className="btn-primary">Rent Now</button>
              </div>
            </div>
            <div className="product-card">
              <div className="product-image" style={{ background: '#54a0ff' }}></div>
              <div className="product-info">
                <h3>Men's Linen Ao Dai</h3>
                <p className="price">$18/day</p>
                <p className="sizes">S-XL</p>
                <button className="btn-primary">Rent Now</button>
              </div>
            </div>
            <div className="product-card">
              <div className="product-image" style={{ background: '#fff' }}></div>
              <div className="product-info">
                <h3>White Student Ao Dai</h3>
                <p className="price">$10/day</p>
                <p className="sizes">S-XL</p>
                <button className="btn-primary">Rent Now</button>
              </div>
            </div>
          </div>
          <button className="btn-secondary">View All</button>
        </div>
      </section>

      {/* Book a Fitting */}
      <section className="booking">
        <div className="container">
          <h2 className="section-title">Book a Fitting Before You Arrive</h2>
          <p className="section-subtitle">Save time and secure your favorite outfit. Choose a time slot, select your style, and just show up to wear it.</p>
          <form className="booking-form" onSubmit={handleBookingSubmit}>
            <input
              type="date"
              value={bookingForm.date}
              onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
              required
            />
            <select
              value={bookingForm.time}
              onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
              required
            >
              <option value="">Select Time</option>
              <option value="9:00">9:00 AM</option>
              <option value="10:00">10:00 AM</option>
              <option value="11:00">11:00 AM</option>
              <option value="14:00">2:00 PM</option>
              <option value="15:00">3:00 PM</option>
              <option value="16:00">4:00 PM</option>
            </select>
            <input
              type="number"
              placeholder="People"
              min="1"
              value={bookingForm.people}
              onChange={(e) => setBookingForm({ ...bookingForm, people: e.target.value })}
              required
            />
            <button type="submit" className="btn-primary">Reserve My Slot</button>
          </form>
        </div>
      </section>

      {/* Service Bundles */}
      <section className="bundles">
        <div className="container">
          <h2 className="section-title">Service Bundles</h2>
          <div className="bundles-grid">
            <div className="bundle-card">
              <h3>Basic Rental</h3>
              <p className="bundle-price">From $10</p>
              <ul>
                <li>1 Outfit (Ao Dai)</li>
                <li>Basic Accessories</li>
                <li>Flexible Return Time</li>
              </ul>
              <button className="btn-secondary">Choose Bundle</button>
            </div>
            <div className="bundle-card popular">
              <div className="popular-badge">MOST POPULAR</div>
              <h3>Full Experience</h3>
              <p className="bundle-price">From $35</p>
              <ul>
                <li>Outfit + Premium Accessories</li>
                <li>Professional Makeup</li>
                <li>Hair Styling Service</li>
              </ul>
              <button className="btn-primary">Choose Bundle</button>
            </div>
            <div className="bundle-card">
              <h3>Photo Combo</h3>
              <p className="bundle-price">From $60</p>
              <ul>
                <li>2 Outfits for Couple</li>
                <li>Makeup & Hair</li>
                <li>1 Hour Photographer</li>
              </ul>
              <button className="btn-secondary">Choose Bundle</button>
            </div>
          </div>
        </div>
      </section>

      {/* Guest Reviews */}
      <section className="reviews">
        <div className="container">
          <h2 className="section-title">Guest Reviews</h2>
          <div className="reviews-grid">
            <div className="review-card">
              <p className="review-text">"The collection at INHERE is absolutely stunning. The silk Ao Dai felt so luxurious and the staff helped me pick the perfect color for my skin tone. Highly recommended!"</p>
              <div className="reviewer">
                <div className="avatar">S</div>
                <div>
                  <p className="reviewer-name">Sarah Jenkins</p>
                  <p className="reviewer-country">USA</p>
                </div>
              </div>
            </div>
            <div className="review-card">
              <p className="review-text">"Dịch vụ rất tốt, đồ mới và sạch sẽ. Mình thích nhất là các bạn nhân viên tư vấn rất nhiệt tình và hỗ trợ tạo dáng chụp ảnh."</p>
              <div className="reviewer">
                <div className="avatar">M</div>
                <div>
                  <p className="reviewer-name">Minh Anh</p>
                  <p className="reviewer-country">Vietnam</p>
                </div>
              </div>
            </div>
            <div className="review-card">
              <p className="review-text">"Beautiful costumes and professional service. The booking process was smooth and the shop is located right in the center of the old town."</p>
              <div className="reviewer">
                <div className="avatar">H</div>
                <div>
                  <p className="reviewer-name">Hiroshi Tanaka</p>
                  <p className="reviewer-country">Japan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hoi An Guide (Blog) */}
      <section className="blog">
        <div className="container">
          <h2 className="section-title">Hoi An Guide</h2>
          <div className="blog-grid">
            <div className="blog-card">
              <div className="blog-image" style={{ background: '#ffeaa7' }}></div>
              <div className="blog-content">
                <p className="blog-date">FEB 12, 2025</p>
                <h3>How to Pose Like a Pro in Ao Dai</h3>
                <p>Tips for elegant postures that highlight the beauty of the traditional dress.</p>
                <button className="btn-link">Read More</button>
              </div>
            </div>
            <div className="blog-card">
              <div className="blog-image" style={{ background: '#fab1a0' }}></div>
              <div className="blog-content">
                <p className="blog-date">FEB 10, 2025</p>
                <h3>Guide to Hoi An's Best Photo Spots</h3>
                <p>Hidden alleys and yellow walls that make the perfect backdrop.</p>
                <button className="btn-link">Read More</button>
              </div>
            </div>
            <div className="blog-card">
              <div className="blog-image" style={{ background: '#dfe6e9' }}></div>
              <div className="blog-content">
                <p className="blog-date">FEB 08, 2025</p>
                <h3>Choosing the Right Color for Your Skin Tone</h3>
                <p>A guide to selecting the perfect Ao Dai color to make you shine.</p>
                <button className="btn-link">Read More</button>
              </div>
            </div>
          </div>
          <button className="btn-secondary">Read All Articles</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-col">
              <h3>INHERE</h3>
              <p className="footer-tagline">HOI AN OUTFIT</p>
              <p>Capturing the soul of Hoi An through traditional attire. We provide premium rental and tailoring services for your perfect ancient town experience.</p>
            </div>
            <div className="footer-col">
              <h4>Explore</h4>
              <ul>
                <li><a href="#rental">Rental Collection</a></li>
                <li><a href="#buy">Buy Traditional Wear</a></li>
                <li><a href="#booking">Book a Fitting</a></li>
                <li><a href="#photo">Photography Combos</a></li>
                <li><a href="#blog">Our Blog</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Policies</h4>
              <ul>
                <li><a href="#terms">Rental Terms</a></li>
                <li><a href="#return">Return Policy</a></li>
                <li><a href="#damages">Damages & Compensation</a></li>
                <li><a href="#privacy">Privacy Policy</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Contact Us</h4>
              <p>123 Tran Phu Street, Hoi An Ancient Town, Quang Nam, Vietnam</p>
              <p>+84 999 999 999</p>
              <p>hello@inhere.vn</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 INHERE. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
