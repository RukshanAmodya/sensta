import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import {
    getFirestore,
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    writeBatch,
    setDoc
} from 'firebase/firestore';
import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL
} from 'firebase/storage';

// --- Firebase Configuration ---
// It's recommended to use environment variables for this in a real project
const firebaseConfig = {
    apiKey: "AIzaSyAhC6XS5LX0X-9PkwA8GJS44l5ESXw31-I",
    authDomain: "sensta-pos.firebaseapp.com",
    projectId: "sensta-pos",
    storageBucket: "sensta-pos.appspot.com",
    messagingSenderId: "609601782893",
    appId: "1:609601782893:web:1ee3426d944f863e55eb64"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- Custom Hook to load external scripts ---
const useScript = (url) => {
    const [status, setStatus] = useState(url ? 'loading' : 'idle');
    useEffect(() => {
        if (!url) { setStatus('idle'); return; }
        let script = document.querySelector(`script[src="${url}"]`);
        if (!script) {
            script = document.createElement('script');
            script.src = url; script.async = true; script.setAttribute('data-status', 'loading');
            document.body.appendChild(script);
            const setAttribute = (el, attr, val) => el.setAttribute(attr, val);
            const handleLoad = () => { setAttribute(script, 'data-status', 'ready'); setStatus('ready'); };
            const handleError = () => { setAttribute(script, 'data-status', 'error'); setStatus('error'); };
            script.addEventListener('load', handleLoad);
            script.addEventListener('error', handleError);
            return () => { if (script) { script.removeEventListener('load', handleLoad); script.removeEventListener('error', handleError); } };
        } else { setStatus(script.getAttribute('data-status') || 'ready'); }
    }, [url]);
    return status;
};

// --- SVG ICONS ---
const LockIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>);
const PlusCircleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>);
const Trash2Icon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>);
const PrinterIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>);
const ClockIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>);
const LogOutIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>);
const ReportsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>);
const XIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>);
const KeyIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>);
const BellIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>);


// --- STATIC DATA ---
const RESTAURANT_DETAILS = {
    address: "13 Sri Ariyavilasa Rd, Horana.",
    contact: "Tel: +94-752 702 702",
    thankYouMessage: "Thank you! Visit again.",
    footer: "System By Pixzoora"
};
const ADMIN_SECRET_KEY = "SUPER_SECRET_KEY_123";
const TAX_RATE = 0.0; // 8% tax
const LOW_STOCK_THRESHOLD = 10;

// --- Main App Component ---
function App() {
    const jspdfStatus = useScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const autotableStatus = useScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');

    const [currentUser, setCurrentUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authView, setAuthView] = useState('login');
    const [currentView, setCurrentView] = useState('pos');

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [orders, setOrders] = useState([]);

    const [activeCategory, setActiveCategory] = useState(null);
    const [cart, setCart] = useState([]);
    const [discount, setDiscount] = useState({ type: 'percentage', value: 0 });
    const [orderType, setOrderType] = useState('Eat From in');

    const [showCheckout, setShowCheckout] = useState(false);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [warningMessage, setWarningMessage] = useState('');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // --- Low Stock Alert State ---
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [showLowStockNotification, setShowLowStockNotification] = useState(false);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocQuery = query(collection(db, "users"), where("uid", "==", user.uid));
                const userDocSnapshot = await getDocs(userDocQuery);
                if (!userDocSnapshot.empty) {
                    setCurrentUser({ uid: user.uid, email: user.email, ...userDocSnapshot.docs[0].data() });
                } else {
                    setCurrentUser({ uid: user.uid, email: user.email, name: 'New User', role: 'Cashier' });
                }
            } else {
                setCurrentUser(null);
            }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!currentUser) return;
        const unsubProducts = onSnapshot(query(collection(db, "products")), (snapshot) => {
            const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(productsData);
        });
        const unsubCategories = onSnapshot(collection(db, "categories"), (snapshot) => {
            const categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCategories(categoriesData);
            if (!activeCategory && categoriesData.length > 0) setActiveCategory(categoriesData[0].id);
        });
        const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        return () => { unsubProducts(); unsubCategories(); unsubOrders(); };
    }, [currentUser, activeCategory]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    
    // Effect to check for low stock products whenever the products list is updated
    useEffect(() => {
        const checkLowStock = () => {
            const lowStock = products.filter(p => p.stock <= LOW_STOCK_THRESHOLD);
            setLowStockProducts(lowStock);
        };
        checkLowStock();
    }, [products]);


    useEffect(() => {
        const savedCart = localStorage.getItem('sensta_pos_cart');
        if (savedCart) setCart(JSON.parse(savedCart));
    }, []);

    useEffect(() => { localStorage.setItem('sensta_pos_cart', JSON.stringify(cart)); }, [cart]);

    const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);
    const taxAmount = useMemo(() => subtotal * TAX_RATE, [subtotal]);
    const discountAmount = useMemo(() => (discount.type === 'percentage' ? subtotal * (discount.value / 100) : discount.value), [subtotal, discount]);
    const grandTotal = useMemo(() => subtotal + taxAmount - discountAmount, [subtotal, taxAmount, discountAmount]);
    const totalItemCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

    const showWarning = (message) => {
        setWarningMessage(message);
        setTimeout(() => setWarningMessage(''), 3000);
    };

    const handleLogin = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    };

    const handleSignUp = async (name, email, password, adminKey) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const userRole = adminKey === ADMIN_SECRET_KEY ? 'Admin' : 'Cashier';
            await setDoc(doc(db, "users", user.uid), { uid: user.uid, name: name, role: userRole });
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    };

    const handleLogout = async () => { await signOut(auth); };

    const addToCart = (product) => {
        if (!product || product.stock <= 0) {
            showWarning(`${product.name} is out of stock!`);
            return;
        }
        setCart(currentCart => {
            const existingItem = currentCart.find(item => item.id === product.id);
            if (existingItem) {
                if (existingItem.quantity >= product.stock) {
                    showWarning(`Maximum stock for ${product.name} reached.`);
                    return currentCart;
                }
                return currentCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...currentCart, { ...product, quantity: 1, notes: '' }];
        });
    };

    const updateCartItem = (productId, newProps) => {
        const productInStore = products.find(p => p.id === productId);
        if (newProps.quantity && productInStore && newProps.quantity > productInStore.stock) {
            showWarning(`Only ${productInStore.stock} units of ${productInStore.name} available.`);
            return;
        }
        setCart(currentCart => currentCart.map(item => item.id === productId ? { ...item, ...newProps } : item));
    };

    const removeFromCart = (productId) => setCart(currentCart => currentCart.filter(item => item.id !== productId));

    const handleSaveOrder = async (paymentDetails) => {
        const { paymentMethod, amountTendered, changeGiven } = paymentDetails;
        const newOrder = {
            id: `SENSTA-${Date.now()}`, createdAt: new Date().toISOString(), cashier: currentUser.name,
            items: cart, subtotal, taxAmount, discountAmount, grandTotal, paymentMethod, orderType,
            amountTendered: amountTendered || null,
            changeGiven: changeGiven || null,
        };
        try {
            const batch = writeBatch(db);
            const orderRef = doc(collection(db, "orders"));
            batch.set(orderRef, newOrder);
            for (const item of cart) {
                const productRef = doc(db, "products", item.id);
                batch.update(productRef, { stock: item.stock - item.quantity });
            }
            await batch.commit();
            setCart([]);
            setDiscount({ type: 'percentage', value: 0 });
            return { ...newOrder, firestore_id: orderRef.id };
        } catch (error) {
            console.error("Error saving order: ", error);
            showWarning("Failed to save order. Please try again.");
            return null;
        }
    };
    
    const handleProductSave = async (productData, imageFile) => {
        try {
            let imageUrl = productData.imageUrl || editingProduct?.imageUrl || '';
            if (imageFile) {
                const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
                const uploadTask = uploadBytesResumable(storageRef, imageFile);
                await uploadTask;
                imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
            }
            const finalProductData = { ...productData, imageUrl };
            if (editingProduct) {
                await updateDoc(doc(db, "products", editingProduct.id), finalProductData);
            } else {
                await addDoc(collection(db, "products"), finalProductData);
            }
            setShowAdminModal(false); setEditingProduct(null);
        } catch (error) { console.error("Error saving product: ", error); showWarning("Failed to save product."); }
    };
    const handleProductDelete = async (productId) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try { await deleteDoc(doc(db, "products", productId)); }
            catch (error) { console.error("Error deleting product: ", error); showWarning("Failed to delete product."); }
        }
    };
    const handleCategorySave = async (categoryName) => {
        if (!categoryName) return;
        try { await addDoc(collection(db, "categories"), { name: categoryName }); setShowCategoryModal(false); }
        catch (error) { console.error("Error adding category: ", error); showWarning("Failed to add category."); }
    };
    const printPdfReceipt = (order) => {
        if (jspdfStatus !== 'ready') { 
            showWarning("PDF library is still loading. Please try again.");
            return; 
        }
        
        const { jsPDF } = window.jspdf;

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [58, 210] 
        });

        doc.setFont('Courier', 'normal');
        doc.setFontSize(8);

        let y = 7;
        const lineSpacing = 4;
        const centerX = 58 / 2;
        const marginX = 3;
        const maxX = 58 - marginX;

        const printLine = (left, right = '') => {
            doc.text(left, marginX, y);
            if (right) {
                doc.text(right, maxX, y, { align: 'right' });
            }
            y += lineSpacing;
        };
        
        const printCenter = (text, size = 8, weight = 'normal') => {
            doc.setFontSize(size);
            doc.setFont('Courier', weight);
            doc.text(text, centerX, y, { align: 'center' });
            y += (size / 2) + (lineSpacing / 2); // Adjust line spacing based on font size
            doc.setFontSize(8); // Reset to default
            doc.setFont('Courier', 'normal'); // Reset to default
        };

        // Base64 Placeholder Logo (a simple 100x100 black square)
        const logoBase64 = "data:image/png;base64,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"
        
        // --- Print Logo ---
        const logoWidth = 20; // 20mm width
        const logoHeight = 20; // 20mm height
        const logoX = centerX - (logoWidth / 2); // Center the logo
        
        try {
            // Add the image (Base64, Format, X, Y, Width, Height)
            doc.addImage(logoBase64, 'PNG', logoX, y, logoWidth, logoHeight);
            y += logoHeight + (lineSpacing / 2); // Move 'y' down past the logo
        } catch (e) {
            console.error("Error adding image to PDF: ", e);
            // Fallback to text if image fails for any reason
            printCenter(RESTAURANT_DETAILS.name, 14, 'bold');
        }

        // Add customizable space here
        const LOGO_ADDRESS_SPACE = 3; // <-- Customizable space in mm
        y += LOGO_ADDRESS_SPACE;
        
        // printCenter(RESTAURANT_DETAILS.name, 14, 'bold'); // This is now handled by the image
        printCenter(RESTAURANT_DETAILS.address);
        printCenter(RESTAURANT_DETAILS.contact);
        printLine('-'.repeat(32));

        const orderDate = new Date(order.createdAt);
        const formattedDate = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
        const formattedTime = `${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`;
        printLine(`Order: #${order.id.slice(-6)}`, `${formattedDate}`);
        printLine(`Cashier: ${order.cashier}`, `${formattedTime}`);
        printLine(`Type: ${order.orderType}`);
        printLine('-'.repeat(32));

        order.items.forEach(item => {
            const itemTotal = (item.price * item.quantity).toFixed(2);
            const itemName = `${item.quantity} x ${item.name}`;
            const splitName = doc.splitTextToSize(itemName, 40);
            doc.text(splitName, marginX, y);
            doc.text(itemTotal, maxX, y, { align: 'right' });
            y += (splitName.length * lineSpacing);
        });
        printLine('-'.repeat(32));
        
        const totalItemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
        printLine('Total Items:', totalItemCount.toString());
        printLine('Subtotal:', order.subtotal.toFixed(2));
        printLine(`Tax (${(TAX_RATE * 100).toFixed(0)}%):`, order.taxAmount.toFixed(2));
        printLine('Discount:', order.discountAmount.toFixed(2));
        
        doc.setFont('Courier', 'bold');
        printLine('TOTAL:', order.grandTotal.toFixed(2));
        doc.setFont('Courier', 'normal');
        
        printLine('Payment:', order.paymentMethod.toUpperCase());
        printLine('-'.repeat(32));

        if (order.paymentMethod === 'Cash' && order.amountTendered) {
            printLine('Cash Tendered:', order.amountTendered.toFixed(2));
            printLine('Change Given:', order.changeGiven.toFixed(2));
            printLine('-'.repeat(32));
        }

        printCenter(RESTAURANT_DETAILS.thankYouMessage);
        printLine('-'.repeat(32));
        printCenter(RESTAURANT_DETAILS.footer);
        
        doc.save(`receipt-${order.id}.pdf`);
    };

    if (authLoading) return <div className="flex justify-center items-center h-screen bg-gray-200"><div className="text-xl font-semibold">Loading Sensta POS...</div></div>;
    if (!currentUser) {
        if (authView === 'login') return <LoginScreen onLogin={handleLogin} onSwitchToSignUp={() => setAuthView('signup')} />;
        if (authView === 'signup') return <SignUpScreen onSignUp={handleSignUp} onSwitchToLogin={() => setAuthView('login')} />;
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans relative">
            <nav className="w-20 bg-white shadow-md flex flex-col items-center py-4 z-10">
                <div className="text-2xl font-bold text-indigo-600 mb-8">S</div>
                <button onClick={() => setCurrentView('pos')} className={`p-3 rounded-lg mb-4 ${currentView === 'pos' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`} title="POS"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></button>
                <button onClick={() => setCurrentView('history')} className={`p-3 rounded-lg mb-4 ${currentView === 'history' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`} title="Order History"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></button>
                <button onClick={() => setCurrentView('reports')} className={`p-3 rounded-lg mb-4 ${currentView === 'reports' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`} title="Reports"><ReportsIcon/></button>
                <button onClick={() => setCurrentView('manage_products')} className={`p-3 rounded-lg mb-4 ${currentView === 'manage_products' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`} title="Manage Products"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6M12 4v2M4 12H2M22 12h-2M6.34 17.66l-1.41-1.41M19.07 4.93l-1.41 1.41M17.66 17.66l-1.41 1.41M4.93 4.93l1.41 1.41M12 6a6 6 0 1 0 6 6"></path><path d="M12 18a6 6 0 0 0 6-6"></path></svg></button>
                <div className="mt-auto"><button onClick={handleLogout} className="p-3 rounded-lg text-red-500 hover:bg-red-100" title="Logout"><LogOutIcon /></button></div>
            </nav>

            <main className="flex-1 flex flex-col">
                <header className="bg-white p-4 shadow-sm flex justify-between items-center">
                    <div><h1 className="text-2xl font-bold text-gray-800">Sensta POS</h1><p className="text-sm text-gray-500">Welcome, {currentUser.name} ({currentUser.role})</p></div>
                    <div className="flex items-center gap-4">
                        {lowStockProducts.length > 0 && (
                            <div className="relative">
                                <button onClick={() => setShowLowStockNotification(prev => !prev)} className="relative text-red-500" title="Low Stock Alerts">
                                    <BellIcon />
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                </button>
                            </div>
                        )}
                        <div className="flex items-center text-gray-600 bg-gray-100 px-4 py-2 rounded-lg"><ClockIcon/><span className="ml-2 font-medium">{currentTime.toLocaleTimeString()}</span></div>
                    </div>
                </header>
                <div className="flex-1 p-4 overflow-auto">
                    {currentView === 'pos' && <POSView categories={categories} products={products} activeCategory={activeCategory} setActiveCategory={setActiveCategory} addToCart={addToCart} cart={cart} updateCartItem={updateCartItem} removeFromCart={removeFromCart} subtotal={subtotal} discount={discount} setDiscount={setDiscount} discountAmount={discountAmount} grandTotal={grandTotal} taxAmount={taxAmount} totalItemCount={totalItemCount} setShowCheckout={setShowCheckout}/>}
                    {currentView === 'history' && <OrderHistoryView orders={orders} printPdf={printPdfReceipt} />}
                    {currentView === 'reports' && <ReportsView orders={orders} products={products} />}
                    {currentView === 'manage_products' && <ManageProductsView products={products} categories={categories} onEdit={(p) => { setEditingProduct(p); setShowAdminModal(true); }} onDelete={handleProductDelete} onAddNew={() => { setEditingProduct(null); setShowAdminModal(true); }} onAddCategory={() => setShowCategoryModal(true)} />}
                </div>
            </main>
            
            {showLowStockNotification && <LowStockNotification lowStockItems={lowStockProducts} onClose={() => setShowLowStockNotification(false)} />}
            {showCheckout && <CheckoutModal grandTotal={grandTotal} onClose={() => setShowCheckout(false)} onSaveOrder={handleSaveOrder} printPdf={printPdfReceipt} orderType={orderType} setOrderType={setOrderType} /> }
            {showAdminModal && <AdminProductModal product={editingProduct} categories={categories} onSave={handleProductSave} onClose={() => { setShowAdminModal(false); setEditingProduct(null); }} /> }
            {showCategoryModal && <AdminCategoryModal onSave={handleCategorySave} onClose={() => setShowCategoryModal(false)} /> }
            {warningMessage && <WarningToast message={warningMessage} /> }
        </div>
    );
}

// --- VIEWS & COMPONENTS ---

const LowStockNotification = ({ lowStockItems, onClose }) => (
    <div className="absolute top-20 right-4 bg-white rounded-lg shadow-xl z-30 w-80 border border-gray-200">
        <div className="p-3 flex justify-between items-center border-b bg-gray-50 rounded-t-lg">
            <h3 className="font-bold text-gray-800">Low Stock Alerts</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><XIcon /></button>
        </div>
        <div className="p-2 max-h-60 overflow-y-auto">
            {lowStockItems.length > 0 ? (
                lowStockItems.map(product => (
                    <div key={product.id} className="p-2 flex justify-between items-center hover:bg-gray-100 rounded-md">
                        <span className="text-sm font-medium text-gray-700">{product.name}</span>
                        <span className="text-sm font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full">{product.stock} left</span>
                    </div>
                ))
            ) : (
                <p className="p-4 text-center text-sm text-gray-500">No low stock items.</p>
            )}
        </div>
    </div>
);


const WarningToast = ({ message }) => (<div className="fixed bottom-5 right-5 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">{message}</div>);

const LoginScreen = ({ onLogin, onSwitchToSignUp }) => {
    const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
    const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault(); setError(''); setLoading(true);
        const result = await onLogin(email, password);
        if (!result.success) setError("Invalid credentials. Please try again.");
        setLoading(false);
    };
    return (
        <div className="flex items-center justify-center h-screen bg-gray-200">
            <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-lg">
                <h1 className="text-3xl font-bold text-center text-indigo-600 mb-2">Sensta POS</h1><p className="text-center text-gray-500 mb-6">Staff Login</p>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-center">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><UserIcon/></span><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. admin@sensta.com" required /></div></div>
                    <div className="mb-6"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password</label><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><LockIcon/></span><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••" required /></div></div>
                    <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 disabled:bg-indigo-400">{loading ? 'Logging in...' : 'Login'}</button>
                </form>
                <div className="text-center mt-4"><button onClick={onSwitchToSignUp} className="text-sm text-indigo-600 hover:underline">Create an account</button></div>
            </div>
        </div>
    );
};

const POSView = ({ categories, products, activeCategory, setActiveCategory, addToCart, cart, updateCartItem, removeFromCart, subtotal, taxAmount, discount, setDiscount, discountAmount, grandTotal, totalItemCount, setShowCheckout }) => (
    <div className="grid grid-cols-12 gap-4 h-full">
        <div className="col-span-7 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex border-b mb-4 overflow-x-auto">
                {categories.map(cat => ( <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-4 py-2 text-sm font-medium flex-shrink-0 ${activeCategory === cat.id ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}>{cat.name}</button> ))}
            </div>
            <div className="grid grid-cols-3 gap-4 overflow-y-auto" style={{maxHeight: 'calc(100vh - 200px)'}}>
                {products.filter(p => p.category === activeCategory).map(product => {
                    const isOutOfStock = product.stock <= 0;
                    return (
                        <div key={product.id} onClick={() => !isOutOfStock && addToCart(product)} className={`relative border rounded-lg p-3 text-center transition-shadow ${ isOutOfStock ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg' }`}>
                            {product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD && (<div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded z-10">LOW STOCK</div>)}
                            {isOutOfStock && (<div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded z-10">OUT OF STOCK</div>)}
                            <img src={product.imageUrl || 'https://placehold.co/200x200/e2e8f0/cbd5e0?text=No+Image'} alt={product.name} className="w-full h-28 bg-gray-200 rounded-md mb-2 object-cover" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x200/e2e8f0/cbd5e0?text=Error'; }} />
                            <h3 className="font-semibold text-gray-800 text-sm h-10 flex items-center justify-center">{product.name}</h3>
                            <p className="text-gray-600 font-bold text-base">LKR {product.price.toFixed(2)}</p>
                        </div>
                    )
                })}
            </div>
        </div>
        <div className="col-span-5 bg-white p-4 rounded-lg shadow-sm flex flex-col">
            <div className="flex justify-between items-center border-b pb-2 mb-2"><h2 className="text-xl font-bold">Current Order</h2></div>
            <div className="flex-grow overflow-y-auto">{cart.length === 0 ? (<p className="text-center text-gray-500 mt-10">Your cart is empty.</p>) : (cart.map(item => <CartItem key={item.id} item={item} onUpdate={updateCartItem} onRemove={removeFromCart} />))}</div>
            <div className="border-t pt-4">
                <div className="flex justify-between font-semibold text-gray-800 mb-2"><span>Total Items</span><span>{totalItemCount}</span></div>
                <div className="flex justify-between text-gray-600 mb-1"><span>Subtotal</span><span>LKR {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-600 mb-2"><span>Tax ({`${(TAX_RATE*100)}%`})</span><span>LKR {taxAmount.toFixed(2)}</span></div>
                <div className="flex items-center gap-2 mb-3"><span className="text-gray-600">Discount</span><input type="number" value={discount.value} onChange={(e) => setDiscount(d => ({ ...d, value: parseFloat(e.target.value) || 0 }))} className="w-20 text-right border rounded-md px-2 py-1" /><select value={discount.type} onChange={(e) => setDiscount(d => ({ ...d, type: e.target.value }))} className="border rounded-md px-2 py-1 bg-gray-100"><option value="percentage">%</option><option value="fixed">LKR</option></select><span className="flex-grow text-right text-red-500">-LKR {discountAmount.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-xl my-4"><span>Total</span><span>LKR {grandTotal.toFixed(2)}</span></div>
                <button onClick={() => setShowCheckout(true)} disabled={cart.length === 0} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400">Proceed to Payment</button>
            </div>
        </div>
    </div>
);

const CartItem = ({ item, onUpdate, onRemove }) => (
    <div className="flex items-center py-3 border-b">
        <div className="flex-grow"><p className="font-semibold text-gray-800">{item.name}</p><p className="text-sm text-gray-500">LKR {item.price.toFixed(2)}</p><input type="text" placeholder="Add notes..." value={item.notes} onChange={(e) => onUpdate(item.id, { notes: e.target.value })} className="text-xs p-1 mt-1 border rounded-md w-full" /></div>
        <div className="flex items-center gap-2 mx-4"><button onClick={() => onUpdate(item.id, { quantity: Math.max(1, item.quantity - 1) })} className="px-2 py-1 bg-gray-200 rounded-md">-</button><span>{item.quantity}</span><button onClick={() => onUpdate(item.id, { quantity: item.quantity + 1 })} className="px-2 py-1 bg-gray-200 rounded-md">+</button></div>
        <p className="font-bold w-20 text-right">LKR {(item.price * item.quantity).toFixed(2)}</p><button onClick={() => onRemove(item.id)} className="ml-4 text-red-500 hover:text-red-700"><Trash2Icon /></button>
    </div>
);

const CheckoutModal = ({ grandTotal, onClose, onSaveOrder, printPdf, orderType, setOrderType }) => {
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [amountTendered, setAmountTendered] = useState('');
    const [printReceipt, setPrintReceipt] = useState(true);
    const change = useMemo(() => { const tendered = parseFloat(amountTendered); if (paymentMethod === 'Cash' && !isNaN(tendered) && tendered >= grandTotal) { return tendered - grandTotal; } return 0; }, [amountTendered, grandTotal, paymentMethod]);
    const handleConfirm = async () => {
        const paymentDetails = { paymentMethod, amountTendered: paymentMethod === 'Cash' ? parseFloat(amountTendered) : grandTotal, changeGiven: change, };
        const order = await onSaveOrder(paymentDetails);
        if (order) {
            if (printReceipt) {
                printPdf(order);
            }
            onClose();
        }
    };
    const isConfirmDisabled = paymentMethod === 'Cash' && (parseFloat(amountTendered) < grandTotal || !amountTendered);
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20">
            <div className="bg-white rounded-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-center">Payment</h2>
                <div className="text-center mb-6"><p className="text-gray-600">Total Amount</p><p className="text-4xl font-bold text-indigo-600">LKR {grandTotal.toFixed(2)}</p></div>
                <div className="mb-6">
                    <p className="font-semibold mb-2">Order Type:</p>
                    <div className="grid grid-cols-2 gap-4">
                        {['Eat From in', 'Take away'].map(type => (
                            <button key={type} onClick={() => setOrderType(type)} className={`p-4 border rounded-lg text-center ${orderType === type ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500' : 'hover:bg-gray-100'}`}>
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="mb-6"><p className="font-semibold mb-2">Select Payment Method:</p><div className="grid grid-cols-3 gap-4">{['Cash', 'Card', 'Mobile'].map(method => (<button key={method} onClick={() => setPaymentMethod(method)} className={`p-4 border rounded-lg text-center ${paymentMethod === method ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500' : 'hover:bg-gray-100'}`}>{method}</button>))}</div></div>
                {paymentMethod === 'Cash' && (
                    <div className="my-6 p-4 bg-gray-50 rounded-lg">
                        <div className="mb-4"><label className="block text-gray-700 font-semibold mb-2" htmlFor="amount-tendered">Amount Tendered (LKR)</label><input id="amount-tendered" type="number" value={amountTendered} onChange={(e) => setAmountTendered(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg text-lg text-right focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" autoFocus /></div>
                        <div className="flex justify-between items-center"><span className="text-lg font-semibold text-gray-700">Change Due:</span><span className="text-2xl font-bold text-green-600">LKR {change.toFixed(2)}</span></div>
                    </div>
                )}
                <div className="mt-4">
                    <label className="flex items-center justify-center text-gray-700">
                        <input
                            type="checkbox"
                            checked={printReceipt}
                            onChange={(e) => setPrintReceipt(e.target.checked)}
                            className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="ml-2">Print Receipt</span>
                    </label>
                </div>
                <div className="flex gap-4 mt-4"><button onClick={onClose} className="w-full bg-gray-300 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-400">Cancel</button><button onClick={handleConfirm} disabled={isConfirmDisabled} className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed">Confirm Payment</button></div>
            </div>
        </div>
    );
};

const OrderHistoryView = ({ orders, printPdf }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Order History</h2>
        <div className="overflow-x-auto"><table className="w-full text-left">
            <thead><tr className="bg-gray-100 text-sm"><th className="p-3">Order ID</th><th className="p-3">Date</th><th className="p-3">Total</th><th className="p-3">Payment</th><th className="p-3">Cashier</th><th className="p-3">Actions</th></tr></thead>
            <tbody>
                {[...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(order => (
                    <tr key={order.id} className="border-b text-sm">
                        <td className="p-3 font-mono text-xs">{order.id}</td><td className="p-3">{new Date(order.createdAt).toLocaleString()}</td>
                        <td className="p-3 font-semibold">LKR {order.grandTotal.toFixed(2)}</td><td className="p-3">{order.paymentMethod}</td>
                        <td className="p-3">{order.cashier}</td>
                        <td className="p-3 flex items-center gap-2">
                            <button onClick={() => printPdf(order)} className="text-red-600 hover:text-red-800" title="Print PDF Receipt"><PrinterIcon /></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>{orders.length === 0 && <p className="text-center p-4 text-gray-500">No orders found.</p>}</div>
    </div>
);

const ManageProductsView = ({ products, categories, onEdit, onDelete, onAddNew, onAddCategory }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">Manage Products</h2><div className="flex gap-4"><button onClick={onAddCategory} className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700">Add Category</button><button onClick={onAddNew} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700"><PlusCircleIcon /> Add New Product</button></div></div>
        <div className="overflow-x-auto"><table className="w-full text-left">
            <thead><tr className="bg-gray-100"><th className="p-3">Image</th><th className="p-3">SKU</th><th className="p-3">Name</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Actions</th></tr></thead>
            <tbody>
                {products.map(product => (
                    <tr key={product.id} className="border-b">
                        <td className="p-3"><img src={product.imageUrl || 'https://placehold.co/40x40/e2e8f0/cbd5e0?text=N/A'} alt={product.name} className="w-10 h-10 rounded-md object-cover" /></td>
                        <td className="p-3 font-mono text-sm">{product.sku}</td><td className="p-3 font-semibold">{product.name}</td>
                        <td className="p-3">{categories.find(c => c.id === product.category)?.name}</td><td className="p-3">LKR {product.price.toFixed(2)}</td>
                        <td className={`p-3 font-bold ${product.stock <= LOW_STOCK_THRESHOLD ? 'text-red-500' : 'text-green-600'}`}>{product.stock}</td>
                        <td className="p-3 flex gap-2"><button onClick={() => onEdit(product)} className="text-blue-500 hover:text-blue-700 p-1"><EditIcon /></button><button onClick={() => onDelete(product.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2Icon /></button></td>
                    </tr>
                ))}
            </tbody>
        </table></div>
    </div>
);

const ReportsView = ({ orders, products }) => {
    const { totalSales, totalOrders, topSellingProducts, todaysSales, todaysOrders } = useMemo(() => {
        const now = new Date(); const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todaysOrdersData = orders.filter(order => new Date(order.createdAt).getTime() >= startOfToday);
        const sales = orders.reduce((sum, order) => sum + order.grandTotal, 0);
        const todaysSalesData = todaysOrdersData.reduce((sum, order) => sum + order.grandTotal, 0);
        const productCount = {}; orders.forEach(order => { order.items.forEach(item => { productCount[item.id] = (productCount[item.id] || 0) + item.quantity; }); });
        const topProducts = Object.entries(productCount).sort(([, qtyA], [, qtyB]) => qtyB - qtyA).slice(0, 5).map(([productId, quantity]) => ({ name: products.find(p => p.id === productId)?.name || 'Unknown', quantity, }));
        return { totalSales: sales, totalOrders: orders.length, topSellingProducts: topProducts, todaysSales: todaysSalesData, todaysOrders: todaysOrdersData.length };
    }, [orders, products]);
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Sales Report</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-green-100 p-6 rounded-lg"><h3 className="text-green-800 font-semibold">Today's Sales</h3><p className="text-3xl font-bold text-green-900">LKR {todaysSales.toFixed(2)}</p></div>
                <div className="bg-yellow-100 p-6 rounded-lg"><h3 className="text-yellow-800 font-semibold">Today's Orders</h3><p className="text-3xl font-bold text-yellow-900">{todaysOrders}</p></div>
                <div className="bg-blue-100 p-6 rounded-lg"><h3 className="text-blue-800 font-semibold">Total Sales (All Time)</h3><p className="text-3xl font-bold text-blue-900">LKR {totalSales.toFixed(2)}</p></div>
                <div className="bg-indigo-100 p-6 rounded-lg"><h3 className="text-indigo-800 font-semibold">Total Orders (All Time)</h3><p className="text-3xl font-bold text-indigo-900">{totalOrders}</p></div>
            </div>
            <div>
                <h3 className="text-xl font-bold mb-4">Top 5 Selling Products (All Time)</h3><table className="w-full text-left">
                <thead><tr className="bg-gray-100"><th className="p-3">Product Name</th><th className="p-3 text-right">Quantity Sold</th></tr></thead>
                <tbody>{topSellingProducts.map((product, index) => (<tr key={index} className="border-b"><td className="p-3 font-semibold">{product.name}</td><td className="p-3 text-right font-bold">{product.quantity}</td></tr>))}</tbody>
            </table></div>
        </div>
    );
};

const AdminProductModal = ({ product, categories, onSave, onClose }) => {
    const [formData, setFormData] = useState({ name: product?.name || '', category: product?.category || (categories[0]?.id || ''), price: product?.price || 0, stock: product?.stock || 0, sku: product?.sku || '', imageUrl: product?.imageUrl || '' });
    const [imageFile, setImageFile] = useState(null); const [imagePreview, setImagePreview] = useState(product?.imageUrl || '');
    useEffect(() => { if (!product && categories.length > 0) { setFormData(f => ({ ...f, category: categories[0].id })); } }, [categories, product]);
    const handleImageChange = (e) => {
        if (e.target.files[0]) {
            const file = e.target.files[0]; setImageFile(file);
            const previewUrl = URL.createObjectURL(file); setImagePreview(previewUrl);
            setFormData(prev => ({ ...prev, imageUrl: '' }));
        }
    };
    const handleUrlChange = (e) => { const url = e.target.value; setFormData(prev => ({ ...prev, imageUrl: url })); setImagePreview(url); setImageFile(null); };
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handleSubmit = (e) => { e.preventDefault(); const dataToSave = { ...formData, price: parseFloat(formData.price), stock: parseInt(formData.stock) }; onSave(dataToSave, imageFile); };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20"><div className="bg-white rounded-lg p-8 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">{product ? 'Edit Product' : 'Add New Product'}</h2><button onClick={onClose}><XIcon /></button></div>
            <form onSubmit={handleSubmit}>
                <div className="flex gap-8">
                    <div className="w-1/3">
                        <label className="block mb-2 font-semibold">Product Image</label>
                        <div className="w-full h-40 bg-gray-200 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                            {imagePreview ? (<img src={imagePreview} alt="Product Preview" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/150x150/e2e8f0/cbd5e0?text=Invalid+URL'; }}/>) : (<span className="text-gray-500 text-sm">No Image</span>)}
                        </div>
                        <label className="block mt-4 mb-1 text-sm font-medium text-gray-700">Upload Image</label><input type="file" onChange={handleImageChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" accept="image/*" />
                        <div className="my-2 text-center text-gray-500 text-sm">OR</div><label className="block mb-1 text-sm font-medium text-gray-700">Enter Image URL</label><input type="url" name="imageUrl" placeholder="https://example.com/image.png" value={formData.imageUrl} onChange={handleUrlChange} className="w-full p-2 border rounded-md text-sm" />
                    </div>
                    <div className="w-2/3">
                        <div className="mb-4"><label className="block mb-1 font-semibold">Product Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded-md" required /></div>
                        <div className="grid grid-cols-2 gap-4 mb-4"><div><label className="block mb-1 font-semibold">Category</label><select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border rounded-md bg-white">{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div><div><label className="block mb-1 font-semibold">SKU</label><input type="text" name="sku" value={formData.sku} onChange={handleChange} className="w-full p-2 border rounded-md" required /></div></div>
                        <div className="grid grid-cols-2 gap-4 mb-6"><div><label className="block mb-1 font-semibold">Price (LKR)</label><input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full p-2 border rounded-md" required min="0" step="0.01" /></div><div><label className="block mb-1 font-semibold">Stock Quantity</label><input type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full p-2 border rounded-md" required min="0" /></div></div>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-6"><button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-lg">Cancel</button><button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Save Product</button></div>
            </form>
        </div></div>
    );
};

const AdminCategoryModal = ({ onSave, onClose }) => {
    const [name, setName] = useState(''); const handleSubmit = (e) => { e.preventDefault(); onSave(name); };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20"><div className="bg-white rounded-lg p-8 w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-4">Add New Category</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4"><label className="block mb-1 font-semibold">Category Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded-md" required /></div>
                <div className="flex justify-end gap-4"><button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-lg">Cancel</button><button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Save</button></div>
            </form>
        </div></div>
    );
};

export default App;





