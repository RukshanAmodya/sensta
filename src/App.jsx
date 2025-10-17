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
    name: "SENSTA",
    address: "Horana, Sri Lanka",
    contact: "Tel: +94-768605501",
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
    const [orderType, setOrderType] = useState('Dine-in');

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
        
        const printCenter = (text) => {
            doc.text(text, centerX, y, { align: 'center' });
            y += lineSpacing;
        };

        printCenter(RESTAURANT_DETAILS.name);
        printCenter(RESTAURANT_DETAILS.address);
        printCenter(RESTAURANT_DETAILS.contact);
        printLine('-'.repeat(32));

        const orderDate = new Date(order.createdAt);
        const formattedDate = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
        const formattedTime = `${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`;
        printLine(`Order: #${order.id.slice(-6)}`, `${formattedDate}`);
        printLine(`Cashier: ${order.cashier}`, `${formattedTime}`);
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
                    {currentView === 'pos' && <POSView categories={categories} products={products} activeCategory={activeCategory} setActiveCategory={setActiveCategory} addToCart={addToCart} cart={cart} updateCartItem={updateCartItem} removeFromCart={removeFromCart} subtotal={subtotal} discount={discount} setDiscount={setDiscount} discountAmount={discountAmount} grandTotal={grandTotal} taxAmount={taxAmount} orderType={orderType} setOrderType={setOrderType} setShowCheckout={setShowCheckout}/>}
                    {currentView === 'history' && <OrderHistoryView orders={orders} printPdf={printPdfReceipt} />}
                    {currentView === 'reports' && <ReportsView orders={orders} products={products} />}
                    {currentView === 'manage_products' && <ManageProductsView products={products} categories={categories} onEdit={(p) => { setEditingProduct(p); setShowAdminModal(true); }} onDelete={handleProductDelete} onAddNew={() => { setEditingProduct(null); setShowAdminModal(true); }} onAddCategory={() => setShowCategoryModal(true)} />}
                </div>
            </main>
            
            {showLowStockNotification && <LowStockNotification lowStockItems={lowStockProducts} onClose={() => setShowLowStockNotification(false)} />}
            {showCheckout && <CheckoutModal grandTotal={grandTotal} onClose={() => setShowCheckout(false)} onSaveOrder={handleSaveOrder} printPdf={printPdfReceipt} /> }
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

const SignUpScreen = ({ onSignUp, onSwitchToLogin }) => {
    const [name, setName] = useState(''); const [email, setEmail] = useState('');
    const [password, setPassword] = useState(''); const [adminKey, setAdminKey] = useState('');
    const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault(); setError(''); setLoading(true);
        const result = await onSignUp(name, email, password, adminKey);
        if (!result.success) setError(result.message || "Failed to create account.");
        setLoading(false);
    };
    return (
        <div className="flex items-center justify-center h-screen bg-gray-200">
            <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-lg">
                <h1 className="text-3xl font-bold text-center text-indigo-600 mb-2">Create Account</h1><p className="text-center text-gray-500 mb-6">Register a new staff member</p>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-center text-sm">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">Full Name</label><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><UserIcon/></span><input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="John Doe" required /></div></div>
                    <div className="mb-4"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="signup-email">Email</label><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></span><input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="staff@sensta.com" required /></div></div>
                    <div className="mb-4"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="signup-password">Password</label><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><LockIcon/></span><input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••" required /></div></div>
                    <div className="mb-6"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="admin-key">Admin Secret Key (Optional)</label><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><KeyIcon/></span><input id="admin-key" type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="For Admin role only" /></div></div>
                    <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 disabled:bg-indigo-400">{loading ? 'Creating...' : 'Create Account'}</button>
                </form>
                <div className="text-center mt-4"><button onClick={onSwitchToLogin} className="text-sm text-indigo-600 hover:underline">Already have an account? Login</button></div>
            </div>
        </div>
    );
};

const POSView = ({ categories, products, activeCategory, setActiveCategory, addToCart, cart, updateCartItem, removeFromCart, subtotal, taxAmount, discount, setDiscount, discountAmount, grandTotal, orderType, setOrderType, setShowCheckout }) => (
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
            <div className="flex justify-between items-center border-b pb-2 mb-2"><h2 className="text-xl font-bold">Current Order</h2><div className="flex gap-1 bg-gray-200 p-1 rounded-lg">{['Dine-in', 'Takeaway', 'Delivery'].map(type => ( <button key={type} onClick={() => setOrderType(type)} className={`px-3 py-1 text-sm rounded-md ${orderType === type ? 'bg-white shadow' : ''}`}>{type}</button>))}</div></div>
            <div className="flex-grow overflow-y-auto">{cart.length === 0 ? (<p className="text-center text-gray-500 mt-10">Your cart is empty.</p>) : (cart.map(item => <CartItem key={item.id} item={item} onUpdate={updateCartItem} onRemove={removeFromCart} />))}</div>
            <div className="border-t pt-4">
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

const CheckoutModal = ({ grandTotal, onClose, onSaveOrder, printPdf }) => {
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [amountTendered, setAmountTendered] = useState('');
    const change = useMemo(() => { const tendered = parseFloat(amountTendered); if (paymentMethod === 'Cash' && !isNaN(tendered) && tendered >= grandTotal) { return tendered - grandTotal; } return 0; }, [amountTendered, grandTotal, paymentMethod]);
    const handleConfirm = async () => {
        const paymentDetails = { paymentMethod, amountTendered: paymentMethod === 'Cash' ? parseFloat(amountTendered) : grandTotal, changeGiven: change, };
        const order = await onSaveOrder(paymentDetails);
        if (order) {
            printPdf(order);
            onClose();
        }
    };
    const isConfirmDisabled = paymentMethod === 'Cash' && (parseFloat(amountTendered) < grandTotal || !amountTendered);
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20">
            <div className="bg-white rounded-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-center">Payment</h2>
                <div className="text-center mb-6"><p className="text-gray-600">Total Amount</p><p className="text-4xl font-bold text-indigo-600">LKR {grandTotal.toFixed(2)}</p></div>
                <div className="mb-6"><p className="font-semibold mb-2">Select Payment Method:</p><div className="grid grid-cols-3 gap-4">{['Cash', 'Card', 'Mobile'].map(method => (<button key={method} onClick={() => setPaymentMethod(method)} className={`p-4 border rounded-lg text-center ${paymentMethod === method ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500' : 'hover:bg-gray-100'}`}>{method}</button>))}</div></div>
                {paymentMethod === 'Cash' && (
                    <div className="my-6 p-4 bg-gray-50 rounded-lg">
                        <div className="mb-4"><label className="block text-gray-700 font-semibold mb-2" htmlFor="amount-tendered">Amount Tendered (LKR)</label><input id="amount-tendered" type="number" value={amountTendered} onChange={(e) => setAmountTendered(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg text-lg text-right focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" autoFocus /></div>
                        <div className="flex justify-between items-center"><span className="text-lg font-semibold text-gray-700">Change Due:</span><span className="text-2xl font-bold text-green-600">LKR {change.toFixed(2)}</span></div>
                    </div>
                )}
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
