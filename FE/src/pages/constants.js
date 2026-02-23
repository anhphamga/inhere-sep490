export const USERS = [
    { id: '1', name: 'James Wilson', email: 'james.wilson@rentaladmin.com', role: 'Owner', status: 'Active', lastLogin: '2 mins ago', avatar: 'https://i.pravatar.cc/150?u=james' },
    { id: '2', name: 'Sarah Chen', email: 'sarah.c@rentaladmin.com', role: 'Staff', status: 'Active', lastLogin: '45 mins ago', avatar: 'https://i.pravatar.cc/150?u=sarah' },
    { id: '3', name: 'Michael Brown', email: 'm.brown@customer.com', role: 'Customer', status: 'Locked', lastLogin: '2 days ago', avatar: 'https://i.pravatar.cc/150?u=michael' },
    { id: '4', name: 'Emily Davis', email: 'emily.d@rentaladmin.com', role: 'Staff', status: 'Active', lastLogin: '3 hours ago', avatar: 'https://i.pravatar.cc/150?u=emily' },
    { id: '5', name: 'Robert Taylor', email: 'rtaylor@customer.com', role: 'Customer', status: 'Active', lastLogin: '5 hours ago', avatar: 'https://i.pravatar.cc/150?u=robert' },
];
export const PRODUCTS = [
    { id: '1', sku: 'DR-2024-001', name: 'Midnight Silk Evening Gown', category: 'Evening Wear', size: ['M', 'L'], rentalPrice: 85, salePrice: 450, deposit: 200, qty: 12, status: 'Available', image: 'https://picsum.photos/seed/dress1/400/600' },
    { id: '2', sku: 'SU-2024-042', name: 'Classic Slim-Fit Tuxedo', category: 'Suits & Tuxedos', size: ['S', 'M', 'L', 'XL'], rentalPrice: 120, salePrice: 680, deposit: 300, qty: 8, status: 'Rented', image: 'https://picsum.photos/seed/suit1/400/600' },
    { id: '3', sku: 'DR-2024-118', name: 'Floral Summer Garden Dress', category: 'Evening Wear', size: ['XS', 'S', 'M'], rentalPrice: 65, salePrice: 320, deposit: 150, qty: 15, status: 'Washing', image: 'https://picsum.photos/seed/dress2/400/600' },
    { id: '4', sku: 'DR-2024-055', name: 'Velvet Bow Cocktail Dress', category: 'Evening Wear', size: ['M'], rentalPrice: 95, salePrice: 510, deposit: 250, qty: 4, status: 'Available', image: 'https://picsum.photos/seed/dress3/400/600' },
    { id: '5', sku: 'SU-2024-009', name: 'Wool Peak Lapel Suit', category: 'Suits & Tuxedos', size: ['L', 'XL'], rentalPrice: 110, salePrice: 590, deposit: 250, qty: 6, status: 'Repair', image: 'https://picsum.photos/seed/suit2/400/600' },
    { id: '6', sku: 'DR-2024-060', name: 'Burgundy Velvet Blazer', category: 'Cocktail Series', size: ['S'], rentalPrice: 85, salePrice: 380, deposit: 150, qty: 3, status: 'Maintenance', image: 'https://picsum.photos/seed/blazer1/400/600' },
    { id: '7', sku: 'DR-2024-070', name: 'Summer Breeze Floral Maxi', category: 'Summer Vacay', size: ['M'], rentalPrice: 70, salePrice: 280, deposit: 100, qty: 10, status: 'Available', image: 'https://picsum.photos/seed/dress4/400/600' },
    { id: '8', sku: 'DR-2024-080', name: 'Bohemian Rhapsody Dress', category: 'Resort Wear', size: ['L'], rentalPrice: 95, salePrice: 350, deposit: 120, qty: 7, status: 'Available', image: 'https://picsum.photos/seed/dress5/400/600' },
];
export const STAFF = [
    { id: '1', name: 'Sarah Chen', email: 'sarah.c@rentaladmin.com', role: 'Floor Manager', shift: 'Morning Shift', shiftTime: '8:00 AM - 4:00 PM', ordersToday: 32, status: 'Active', avatar: 'https://i.pravatar.cc/150?u=sarah' },
    { id: '2', name: 'Michael Ross', email: 'm.ross@rentaladmin.com', role: 'Inventory Specialist', shift: 'Swing Shift', shiftTime: '12:00 PM - 8:00 PM', ordersToday: 18, status: 'Inactive', avatar: 'https://i.pravatar.cc/150?u=michael_r' },
    { id: '3', name: 'Emma Wilson', email: 'emma.w@rentaladmin.com', role: 'Customer Support', shift: 'Morning Shift', shiftTime: '8:00 AM - 4:00 PM', ordersToday: 45, status: 'Active', avatar: 'https://i.pravatar.cc/150?u=emma' },
    { id: '4', name: 'David Kim', email: 'david.k@rentaladmin.com', role: 'Logistics Manager', shift: 'Evening Shift', shiftTime: '4:00 PM - 12:00 AM', ordersToday: 29, status: 'Active', avatar: 'https://i.pravatar.cc/150?u=david' },
    { id: '5', name: 'Jessica Lee', email: 'jessica.l@rentaladmin.com', role: 'Showroom Assistant', shift: 'On Leave', shiftTime: 'Vacation', ordersToday: 0, status: 'Inactive', avatar: 'https://i.pravatar.cc/150?u=jessica' },
];
export const SHIFTS = [
    { id: '1', staffName: 'Sarah Miller', avatar: 'https://i.pravatar.cc/150?u=sarah_m', startTime: '08:00 AM', endTime: '04:00 PM', day: 'Monday', type: 'secondary' },
    { id: '2', staffName: 'John Doe', avatar: 'https://i.pravatar.cc/150?u=john', startTime: '10:00 AM', endTime: '06:00 PM', day: 'Monday', type: 'secondary' },
    { id: '3', staffName: 'Emily Chen', avatar: 'https://i.pravatar.cc/150?u=emily_c', startTime: '09:00 AM', endTime: '05:00 PM', day: 'Tuesday', type: 'secondary' },
    { id: '4', staffName: 'Sarah Miller', avatar: 'https://i.pravatar.cc/150?u=sarah_m', startTime: '08:00 AM', endTime: '04:00 PM', day: 'Wednesday', type: 'active', status: 'In Progress' },
    { id: '5', staffName: 'Mike Ross', avatar: 'https://i.pravatar.cc/150?u=mike', startTime: '12:00 PM', endTime: '08:00 PM', day: 'Wednesday', type: 'secondary' },
    { id: '6', staffName: 'John Doe', avatar: 'https://i.pravatar.cc/150?u=john', startTime: '08:00 AM', endTime: '04:00 PM', day: 'Thursday', type: 'secondary' },
    { id: '7', staffName: 'Emily Chen', avatar: 'https://i.pravatar.cc/150?u=emily_c', startTime: '09:00 AM', endTime: '05:00 PM', day: 'Friday', type: 'secondary' },
    { id: '8', staffName: 'Sarah Miller', avatar: 'https://i.pravatar.cc/150?u=sarah_m', startTime: '02:00 PM', endTime: '10:00 PM', day: 'Friday', type: 'secondary' },
    { id: '9', staffName: 'Mike Ross', avatar: 'https://i.pravatar.cc/150?u=mike', startTime: '10:00 AM', endTime: '06:00 PM', day: 'Saturday', type: 'secondary' },
];
export const ORDERS = [
    { id: '#ORD-9901', customerName: 'Alice Johnson', productName: 'Midnight Silk Evening Gown', date: 'Oct 20, 2024', returnDate: 'Oct 23, 2024', status: 'Active', amount: 85.00, type: 'Rental' },
    { id: '#ORD-9902', customerName: 'Bob Smith', productName: 'Classic Slim-Fit Tuxedo', date: 'Oct 18, 2024', returnDate: 'Oct 21, 2024', status: 'Returned', amount: 120.00, type: 'Rental' },
    { id: '#ORD-9903', customerName: 'Charlie Davis', productName: 'Floral Summer Garden Dress', date: 'Oct 22, 2024', returnDate: 'Oct 25, 2024', status: 'Pending', amount: 65.00, type: 'Rental' },
    { id: '#ORD-9904', customerName: 'Diana Prince', productName: 'Velvet Bow Cocktail Dress', date: 'Oct 15, 2024', returnDate: 'Oct 18, 2024', status: 'Overdue', amount: 95.00, type: 'Rental' },
    { id: '#ORD-9905', customerName: 'Edward Norton', productName: 'Wool Peak Lapel Suit', date: 'Oct 21, 2024', returnDate: 'N/A', status: 'Returned', amount: 590.00, type: 'Sale' },
    { id: '#ORD-9906', customerName: 'Fiona Gallagher', productName: 'Burgundy Velvet Blazer', date: 'Oct 19, 2024', returnDate: 'Oct 22, 2024', status: 'Active', amount: 85.00, type: 'Rental' },
];
export const PROMOTIONS = [
    { id: '1', name: 'Summer Sale 2024', code: 'SUMMER24', discount: '20% OFF', startDate: 'Jun 01, 2024', endDate: 'Aug 31, 2024', status: 'Expired', usage: 1240 },
    { id: '2', name: 'New User Welcome', code: 'WELCOME10', discount: '$10 OFF', startDate: 'Jan 01, 2024', endDate: 'Dec 31, 2024', status: 'Active', usage: 850 },
    { id: '3', name: 'Holiday Special', code: 'HOLIDAY24', discount: '15% OFF', startDate: 'Dec 01, 2024', endDate: 'Dec 31, 2024', status: 'Scheduled', usage: 0 },
    { id: '4', name: 'VIP Exclusive', code: 'VIPRENT', discount: 'BOGO Rental', startDate: 'Oct 01, 2024', endDate: 'Oct 31, 2024', status: 'Active', usage: 320 },
];
export const MEMBERSHIP_PLANS = [
    { id: '1', name: 'Basic', price: 29, billing: 'Monthly', features: ['2 Rentals / month', 'Standard Support', 'No Sales Discount'], activeMembers: 1240, color: 'bg-slate-500' },
    { id: '2', name: 'Premium', price: 59, billing: 'Monthly', features: ['5 Rentals / month', 'Priority Support', '10% Sales Discount', 'Free Shipping'], activeMembers: 850, color: 'bg-[#1975d2]' },
    { id: '3', name: 'Elite', price: 99, billing: 'Monthly', features: ['Unlimited Rentals', '24/7 Support', '20% Sales Discount', 'Free Shipping', 'Early Access'], activeMembers: 320, color: 'bg-purple-600' },
];
export const ALERTS = [
    { id: '1', title: 'Low Inventory Alert', message: 'Midnight Silk Evening Gown (M) is below safety stock level (2 units left).', time: '10 mins ago', type: 'warning', read: false },
    { id: '2', title: 'New Membership Signup', message: 'Sarah Jenkins has upgraded to Elite Membership.', time: '45 mins ago', type: 'success', read: false },
    { id: '3', title: 'Overdue Rental', message: 'Order #ORD-8540 is 2 days overdue. Customer: Michael Brown.', time: '2 hours ago', type: 'error', read: true },
    { id: '4', title: 'System Maintenance', message: 'Scheduled maintenance on Sunday, Oct 27 at 2:00 AM EST.', time: '5 hours ago', type: 'info', read: true },
];
export const REPORTS = [
    { id: '1', title: 'Monthly Revenue Report - Sept 2024', category: 'Financial', date: 'Oct 01, 2024', format: 'PDF', size: '2.4 MB' },
    { id: '2', title: 'Inventory Utilization Analysis', category: 'Inventory', date: 'Oct 15, 2024', format: 'XLS', size: '1.8 MB' },
    { id: '3', title: 'Staff Performance Review Q3', category: 'Staff', date: 'Oct 10, 2024', format: 'PDF', size: '4.1 MB' },
    { id: '4', title: 'Customer Retention Metrics', category: 'Customers', date: 'Oct 20, 2024', format: 'CSV', size: '0.8 MB' },
    { id: '5', title: 'Quarterly Tax Summary', category: 'Financial', date: 'Oct 05, 2024', format: 'PDF', size: '1.2 MB' },
];
