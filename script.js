// Configuration - Stockage local
const STORAGE_KEYS = {
    USERS: 'dz_loc_users',
    PROPERTIES: 'dz_loc_properties',
    CONVERSATIONS: 'dz_loc_conversations',
    VISITS: 'dz_loc_visits',
    CURRENT_USER: 'dz_loc_current_user',
    FAVORITES: 'dz_loc_favorites',
    REVIEWS: 'dz_loc_reviews',
    SAVED_SEARCHES: 'dz_loc_saved_searches'
};

// Gestion du thème
let isDarkMode = false;
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    document.getElementById('themeIcon').textContent = isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// Gestion du menu
function toggleMenu() {
    const navMenu = document.getElementById('navMenu');
    const hamburger = document.getElementById('hamburger');
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
}

// Navigation entre écrans
let currentUser = null;
let userType = 'tenant';
let properties = [];
let users = [];
let conversations = [];
let visits = [];
let currentPropertyImages = [];
let currentWhatsAppProperty = null;
let currentChat = {propertyId: null, otherUserId: null};
let currentAvatar = null;
let currentViewUserId = null;
let modalPropertyOwnerId = null;
let currentReviewStars = 0;
let modalPropertyId = null;

// Fonctions de stockage local
function getStorageData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : (key === STORAGE_KEYS.USERS ? [] : []);
    } catch (error) {
        console.error('Erreur de lecture du localStorage:', error);
        return [];
    }
}

function setStorageData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Erreur d\'écriture dans le localStorage:', error);
        return false;
    }
}

// Simulation d'appels API avec localStorage
async function apiCall(endpoint, options = {}) {
    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 300));

    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : null;

    try {
        switch (endpoint) {
            // Authentification
            case '/api/auth/register':
                return handleRegister(body);
            case '/api/auth/login':
                return handleLogin(body);
            case '/api/auth/me':
                return handleGetCurrentUser();
            case '/api/auth/logout':
                return handleLogout();

            // Utilisateurs
            case '/api/users/profile':
                return method === 'PUT' ? handleUpdateProfile(body) : null;
            case '/api/users/change-password':
                return handleChangePassword(body);
            case '/api/users/preferences':
                return handleUpdatePreferences(body);
            case '/api/users/favorites':
                return method === 'GET' ? handleGetFavorites() : null;
            case '/api/users/toggle-favorite':
                return handleToggleFavorite(body);
            case '/api/users/saved-searches':
                return handleSaveSearch(body);
            case `/api/users/${endpoint.split('/')[3]}`:
                const userId = endpoint.split('/')[3];
                return handleGetUser(userId);
            case `/api/users/${endpoint.split('/')[3]}/properties`:
                const ownerId = endpoint.split('/')[3];
                return handleGetUserProperties(ownerId);

            // Propriétés
            case '/api/properties':
                if (method === 'POST') return handleCreateProperty(body);
                // Gérer les query params pour la recherche
                const urlParams = new URLSearchParams(endpoint.split('?')[1]);
                return handleGetProperties(urlParams);
            case '/api/properties/my-properties':
                return handleGetMyProperties();
            case `/api/properties/${endpoint.split('/')[3]}`:
                const propId = endpoint.split('/')[3];
                if (method === 'PUT') return handleUpdateProperty(propId, body);
                if (method === 'DELETE') return handleDeleteProperty(propId);
                return handleGetProperty(propId);
            case `/api/properties/${endpoint.split('/')[3]}/view`:
                return handleIncrementViews(endpoint.split('/')[3]);
            case `/api/properties/${endpoint.split('/')[3]}/reviews`:
                return method === 'POST' ? handleCreateReview(endpoint.split('/')[3], body) : null;

            // Conversations
            case '/api/conversations':
                return method === 'POST' ? handleCreateConversation(body) : handleGetConversations();
            case '/api/conversations/my-conversations':
                return handleGetMyConversations();
            case `/api/conversations/property/${endpoint.split('/')[4]}/user/${endpoint.split('/')[6]}`:
                const propertyId = endpoint.split('/')[4];
                const otherUserId = endpoint.split('/')[6];
                return handleGetConversation(propertyId, otherUserId);
            case '/api/conversations/message':
                return handleSendMessage(body);

            // Visites
            case '/api/visits':
                return method === 'POST' ? handleCreateVisit(body) : null;
            case '/api/visits/my-visits':
                return handleGetMyVisits();
            case '/api/visits/my-property-visits':
                return handleGetMyPropertyVisits();
            case `/api/visits/${endpoint.split('/')[3]}/respond`:
                const visitId = endpoint.split('/')[3];
                return handleRespondToVisit(visitId, body);

            // Contact
            case '/api/contact':
                return { success: true };

            default:
                throw new Error(`Endpoint non trouvé: ${endpoint}`);
        }
    } catch (error) {
        console.error('Erreur API simulée:', error);
        throw error;
    }
}

// Gestionnaires d'authentification
function handleRegister(userData) {
    const users = getStorageData(STORAGE_KEYS.USERS);
    
    // Vérifier si l'email existe déjà
    if (users.find(user => user.email === userData.email)) {
        throw new Error('Un utilisateur avec cet email existe déjà');
    }

    // Créer le nouvel utilisateur
    const newUser = {
        id: Date.now().toString(),
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        type: userData.type,
        bio: '',
        avatar: null,
        preferences: {
            emailNotifications: true,
            smsNotifications: false,
            whatsappNotifications: true,
            language: 'fr'
        },
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    setStorageData(STORAGE_KEYS.USERS, users);
    
    // Stocker l'utilisateur courant
    setStorageData(STORAGE_KEYS.CURRENT_USER, newUser);

    return {
        token: 'simulated-jwt-token',
        user: newUser
    };
}

function handleLogin(loginData) {
    const users = getStorageData(STORAGE_KEYS.USERS);
    const user = users.find(u => u.email === loginData.email && u.password === loginData.password);

    if (!user) {
        throw new Error('Email ou mot de passe incorrect');
    }

    // Stocker l'utilisateur courant
    setStorageData(STORAGE_KEYS.CURRENT_USER, user);

    return {
        token: 'simulated-jwt-token',
        user: user
    };
}

function handleGetCurrentUser() {
    const user = getStorageData(STORAGE_KEYS.CURRENT_USER);
    if (!user || !user.id) {
        throw new Error('Utilisateur non connecté');
    }
    return user;
}

function handleLogout() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    return { success: true };
}

// Gestionnaires d'utilisateurs
function handleUpdateProfile(profileData) {
    const users = getStorageData(STORAGE_KEYS.USERS);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) {
        throw new Error('Utilisateur non trouvé');
    }

    users[userIndex] = { ...users[userIndex], ...profileData };
    setStorageData(STORAGE_KEYS.USERS, users);
    setStorageData(STORAGE_KEYS.CURRENT_USER, users[userIndex]);

    return users[userIndex];
}

function handleChangePassword(passwordData) {
    const users = getStorageData(STORAGE_KEYS.USERS);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) {
        throw new Error('Utilisateur non trouvé');
    }

    // Vérifier l'ancien mot de passe
    if (users[userIndex].password !== passwordData.currentPassword) {
        throw new Error('Mot de passe actuel incorrect');
    }

    users[userIndex].password = passwordData.newPassword;
    setStorageData(STORAGE_KEYS.USERS, users);
    setStorageData(STORAGE_KEYS.CURRENT_USER, users[userIndex]);

    return { success: true };
}

function handleUpdatePreferences(preferencesData) {
    const users = getStorageData(STORAGE_KEYS.USERS);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) {
        throw new Error('Utilisateur non trouvé');
    }

    users[userIndex].preferences = { ...users[userIndex].preferences, ...preferencesData };
    setStorageData(STORAGE_KEYS.USERS, users);
    setStorageData(STORAGE_KEYS.CURRENT_USER, users[userIndex]);

    return { success: true };
}

function handleGetUser(userId) {
    const users = getStorageData(STORAGE_KEYS.USERS);
    const user = users.find(u => u.id === userId);
    if (!user) {
        throw new Error('Utilisateur non trouvé');
    }
    
    // Ne pas renvoyer le mot de passe
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

function handleGetUserProperties(ownerId) {
    const properties = getStorageData(STORAGE_KEYS.PROPERTIES);
    return properties.filter(p => p.ownerId === ownerId);
}

function handleSaveSearch(searchData) {
    const savedSearches = getStorageData(STORAGE_KEYS.SAVED_SEARCHES);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    
    const newSearch = {
        id: Date.now().toString(),
        userId: currentUser.id,
        ...searchData,
        createdAt: new Date().toISOString()
    };

    savedSearches.push(newSearch);
    setStorageData(STORAGE_KEYS.SAVED_SEARCHES, savedSearches);
    return { success: true };
}

// Gestionnaires de favoris
function handleGetFavorites() {
    const favorites = getStorageData(STORAGE_KEYS.FAVORITES);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    const properties = getStorageData(STORAGE_KEYS.PROPERTIES);
    
    const userFavorites = favorites.filter(f => f.userId === currentUser.id);
    const favoriteProperties = properties.filter(p => 
        userFavorites.some(f => f.propertyId === p.id)
    );
    
    // Ajouter les reviews aux propriétés
    const reviews = getStorageData(STORAGE_KEYS.REVIEWS);
    return favoriteProperties.map(property => ({
        ...property,
        reviews: reviews.filter(r => r.propertyId === property.id)
    }));
}

function handleToggleFavorite(data) {
    const favorites = getStorageData(STORAGE_KEYS.FAVORITES);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    
    const existingIndex = favorites.findIndex(f => 
        f.userId === currentUser.id && f.propertyId === data.propertyId
    );

    if (existingIndex >= 0) {
        favorites.splice(existingIndex, 1);
    } else {
        favorites.push({
            id: Date.now().toString(),
            userId: currentUser.id,
            propertyId: data.propertyId,
            createdAt: new Date().toISOString()
        });
    }

    setStorageData(STORAGE_KEYS.FAVORITES, favorites);
    return { success: true };
}

// Gestionnaires de propriétés
function handleGetProperties(urlParams = null) {
    let properties = getStorageData(STORAGE_KEYS.PROPERTIES);
    const reviews = getStorageData(STORAGE_KEYS.REVIEWS);

    // Filtrer selon les paramètres de recherche
    if (urlParams) {
        const city = urlParams.get('city');
        const type = urlParams.get('type');
        const minPrice = urlParams.get('minPrice');
        const maxPrice = urlParams.get('maxPrice');
        const minSurface = urlParams.get('minSurface');
        const bedrooms = urlParams.get('bedrooms');
        const amenities = urlParams.getAll('amenities');
        const sortBy = urlParams.get('sortBy');

        if (city) {
            properties = properties.filter(p => 
                p.city.toLowerCase().includes(city.toLowerCase())
            );
        }
        if (type) {
            properties = properties.filter(p => p.type === type);
        }
        if (minPrice) {
            properties = properties.filter(p => p.price >= parseInt(minPrice));
        }
        if (maxPrice) {
            properties = properties.filter(p => p.price <= parseInt(maxPrice));
        }
        if (minSurface) {
            properties = properties.filter(p => p.surface >= parseInt(minSurface));
        }
        if (bedrooms) {
            properties = properties.filter(p => p.bedrooms >= parseInt(bedrooms));
        }
        if (amenities.length > 0) {
            properties = properties.filter(p => 
                amenities.every(amenity => p.amenities.includes(amenity))
            );
        }
        if (sortBy) {
            switch(sortBy) {
                case 'price_asc':
                    properties.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    properties.sort((a, b) => b.price - a.price);
                    break;
                case 'newest':
                    properties.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
            }
        }
    }

    // Ajouter les reviews à chaque propriété
    return properties.map(property => ({
        ...property,
        reviews: reviews.filter(r => r.propertyId === property.id)
    }));
}

function handleGetMyProperties() {
    const properties = getStorageData(STORAGE_KEYS.PROPERTIES);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    const reviews = getStorageData(STORAGE_KEYS.REVIEWS);
    
    const myProperties = properties.filter(p => p.ownerId === currentUser.id);
    
    // Ajouter les reviews aux propriétés
    return myProperties.map(property => ({
        ...property,
        reviews: reviews.filter(r => r.propertyId === property.id)
    }));
}

function handleGetProperty(propertyId) {
    const properties = getStorageData(STORAGE_KEYS.PROPERTIES);
    const reviews = getStorageData(STORAGE_KEYS.REVIEWS);
    
    const property = properties.find(p => p.id === propertyId);
    if (!property) {
        throw new Error('Propriété non trouvée');
    }

    // Ajouter les avis à la propriété
    property.reviews = reviews.filter(r => r.propertyId === propertyId);
    return property;
}

function handleIncrementViews(propertyId) {
    const properties = getStorageData(STORAGE_KEYS.PROPERTIES);
    const propertyIndex = properties.findIndex(p => p.id === propertyId);
    
    if (propertyIndex !== -1) {
        properties[propertyIndex].views = (properties[propertyIndex].views || 0) + 1;
        setStorageData(STORAGE_KEYS.PROPERTIES, properties);
    }
    
    return { success: true };
}

function handleCreateProperty(propertyData) {
    const properties = getStorageData(STORAGE_KEYS.PROPERTIES);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    
    const newProperty = {
        id: Date.now().toString(),
        ...propertyData,
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        views: 0,
        createdAt: new Date().toISOString()
    };

    properties.push(newProperty);
    setStorageData(STORAGE_KEYS.PROPERTIES, properties);
    return newProperty;
}

function handleUpdateProperty(propertyId, propertyData) {
    const properties = getStorageData(STORAGE_KEYS.PROPERTIES);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    
    const propertyIndex = properties.findIndex(p => p.id === propertyId && p.ownerId === currentUser.id);
    if (propertyIndex === -1) {
        throw new Error('Propriété non trouvée');
    }

    properties[propertyIndex] = { ...properties[propertyIndex], ...propertyData };
    setStorageData(STORAGE_KEYS.PROPERTIES, properties);
    return properties[propertyIndex];
}

function handleDeleteProperty(propertyId) {
    const properties = getStorageData(STORAGE_KEYS.PROPERTIES);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    
    const propertyIndex = properties.findIndex(p => p.id === propertyId && p.ownerId === currentUser.id);
    if (propertyIndex === -1) {
        throw new Error('Propriété non trouvée');
    }

    properties.splice(propertyIndex, 1);
    setStorageData(STORAGE_KEYS.PROPERTIES, properties);
    
    // Supprimer aussi les favoris associés
    const favorites = getStorageData(STORAGE_KEYS.FAVORITES);
    const updatedFavorites = favorites.filter(f => f.propertyId !== propertyId);
    setStorageData(STORAGE_KEYS.FAVORITES, updatedFavorites);
    
    return { success: true };
}

// Gestionnaires d'avis
function handleCreateReview(propertyId, reviewData) {
    const reviews = getStorageData(STORAGE_KEYS.REVIEWS);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    
    const newReview = {
        id: Date.now().toString(),
        propertyId: propertyId,
        userId: currentUser.id,
        userName: currentUser.name,
        stars: reviewData.stars,
        comment: reviewData.comment,
        date: new Date().toISOString()
    };

    reviews.push(newReview);
    setStorageData(STORAGE_KEYS.REVIEWS, reviews);
    return newReview;
}

// Gestionnaires de conversations
function handleGetConversations() {
    return getStorageData(STORAGE_KEYS.CONVERSATIONS);
}

function handleGetMyConversations() {
    const conversations = getStorageData(STORAGE_KEYS.CONVERSATIONS);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    
    return conversations.filter(c => 
        c.user1Id === currentUser.id || c.user2Id === currentUser.id
    );
}

function handleGetConversation(propertyId, otherUserId) {
    const conversations = getStorageData(STORAGE_KEYS.CONVERSATIONS);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    
    let conversation = conversations.find(c => 
        c.propertyId === propertyId && 
        ((c.user1Id === currentUser.id && c.user2Id === otherUserId) ||
         (c.user2Id === currentUser.id && c.user1Id === otherUserId))
    );

    if (!conversation) {
        // Créer une nouvelle conversation
        conversation = {
            id: Date.now().toString(),
            propertyId: propertyId,
            user1Id: currentUser.id,
            user2Id: otherUserId,
            messages: [],
            createdAt: new Date().toISOString()
        };
        conversations.push(conversation);
        setStorageData(STORAGE_KEYS.CONVERSATIONS, conversations);
    }

    return conversation;
}

function handleCreateConversation(conversationData) {
    const conversations = getStorageData(STORAGE_KEYS.CONVERSATIONS);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    
    const newConversation = {
        id: Date.now().toString(),
        ...conversationData,
        user1Id: currentUser.id,
        messages: [],
        createdAt: new Date().toISOString()
    };

    conversations.push(newConversation);
    setStorageData(STORAGE_KEYS.CONVERSATIONS, conversations);
    return newConversation;
}

function handleSendMessage(messageData) {
    const conversations = getStorageData(STORAGE_KEYS.CONVERSATIONS);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    
    const conversation = conversations.find(c => 
        c.propertyId === messageData.propertyId && 
        ((c.user1Id === currentUser.id && c.user2Id === messageData.otherUserId) ||
         (c.user2Id === currentUser.id && c.user1Id === messageData.otherUserId))
    );

    if (!conversation) {
        throw new Error('Conversation non trouvée');
    }

    const newMessage = {
        id: Date.now().toString(),
        senderId: currentUser.id,
        content: messageData.content,
        timestamp: new Date().toISOString()
    };

    conversation.messages.push(newMessage);
    setStorageData(STORAGE_KEYS.CONVERSATIONS, conversations);
    return newMessage;
}

// Gestionnaires de visites
function handleGetVisits() {
    return getStorageData(STORAGE_KEYS.VISITS);
}

function handleGetMyVisits() {
    const visits = getStorageData(STORAGE_KEYS.VISITS);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    return visits.filter(v => v.userId === currentUser.id);
}

function handleGetMyPropertyVisits() {
    const visits = getStorageData(STORAGE_KEYS.VISITS);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    const properties = getStorageData(STORAGE_KEYS.PROPERTIES);
    
    const myPropertyIds = properties
        .filter(p => p.ownerId === currentUser.id)
        .map(p => p.id);
    
    return visits.filter(v => myPropertyIds.includes(v.propertyId));
}

function handleCreateVisit(visitData) {
    const visits = getStorageData(STORAGE_KEYS.VISITS);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    
    const newVisit = {
        id: Date.now().toString(),
        ...visitData,
        userId: currentUser.id,
        userName: currentUser.name,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    visits.push(newVisit);
    setStorageData(STORAGE_KEYS.VISITS, visits);
    return newVisit;
}

function handleRespondToVisit(visitId, responseData) {
    const visits = getStorageData(STORAGE_KEYS.VISITS);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    
    const visitIndex = visits.findIndex(v => v.id === visitId);
    if (visitIndex === -1) {
        throw new Error('Visite non trouvée');
    }

    // Vérifier que l'utilisateur est bien le propriétaire
    const properties = getStorageData(STORAGE_KEYS.PROPERTIES);
    const visit = visits[visitIndex];
    const property = properties.find(p => p.id === visit.propertyId);
    
    if (!property || property.ownerId !== currentUser.id) {
        throw new Error('Non autorisé');
    }

    visits[visitIndex].status = responseData.status;
    visits[visitIndex].ownerResponse = responseData.response;
    setStorageData(STORAGE_KEYS.VISITS, visits);
    
    return { success: true };
}

// Charger les données depuis le localStorage
function loadInitialData() {
    try {
        showLoading();
        
        // Charger les propriétés
        properties = getStorageData(STORAGE_KEYS.PROPERTIES);
        
        // Charger les utilisateurs
        users = getStorageData(STORAGE_KEYS.USERS);
        
        // Charger les conversations si l'utilisateur est connecté
        if (currentUser) {
            conversations = getStorageData(STORAGE_KEYS.CONVERSATIONS);
            visits = getStorageData(STORAGE_KEYS.VISITS);
        }
        
        hideLoading();
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        hideLoading();
    }
}

function showScreen(screenId, params = {}) {
    // Masquer tous les écrans
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    // Afficher l'écran sélectionné
    document.getElementById(screenId).classList.add('active');
    // Fermer le menu mobile
    document.getElementById('navMenu').classList.remove('active');
    document.getElementById('hamburger').classList.remove('active');
    
    // Charger les données si nécessaire
    if (screenId === 'ownerDashboard') {
        loadOwnerProperties();
    } else if (screenId === 'tenantDashboard') {
        loadTenantProperties();
    } else if (screenId === 'search') {
        loadSearchResults();
    } else if (screenId === 'messages') {
        loadConversations();
        loadVisitRequests();
    } else if (screenId === 'profile') {
        loadProfileData();
    } else if (screenId === 'userProfile') {
        currentViewUserId = params.userId;
        loadUserProfileData(params.userId);
    }
}

// Validation du formulaire
function validateForm(form) {
    let isValid = true;
    form.querySelectorAll('input[required], select[required], textarea[required]').forEach(field => {
        const errorId = field.id + 'Error';
        const errorElem = document.getElementById(errorId);
        if (errorElem) errorElem.classList.remove('active');
        if (!field.value.trim()) {
            if (errorElem) {
                errorElem.textContent = 'Ce champ est obligatoire';
                errorElem.classList.add('active');
            }
            isValid = false;
        } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
            if (errorElem) {
                errorElem.textContent = 'Email invalide';
                errorElem.classList.add('active');
            }
            isValid = false;
        } else if (field.type === 'password' && field.value.length < 6) {
            if (errorElem) {
                errorElem.textContent = 'Le mot de passe doit contenir au moins 6 caractères';
                errorElem.classList.add('active');
            }
            isValid = false;
        }
    });
    return isValid;
}

// Gestion du chargement
function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// Gestionnaire d'inscription
document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!validateForm(this)) return;
    showLoading();
    
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation supplémentaire
    if (password !== confirmPassword) {
        document.getElementById('confirmPasswordError').textContent = 'Les mots de passe ne correspondent pas';
        document.getElementById('confirmPasswordError').classList.add('active');
        hideLoading();
        return;
    }

    // Créer l'utilisateur
    const userData = {
        name: fullName,
        email: email,
        phone: phone,
        password: password,
        type: userType
    };

    apiCall('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
    })
    .then(data => {
        if (data.token) {
            currentUser = data.user;

            const successDiv = document.createElement('div');
            successDiv.className = 'success-message';
            successDiv.textContent = 'Inscription réussie ! Redirection...';
            this.parentNode.insertBefore(successDiv, this);

            updateNavForLoggedUser();
            if (userType === 'tenant') {
                document.getElementById('tenantName').textContent = fullName;
                showScreen('tenantDashboard');
            } else {
                document.getElementById('ownerName').textContent = fullName;
                showScreen('ownerDashboard');
            }
            
            // Charger les données initiales
            loadInitialData();
        }
        hideLoading();
    })
    .catch(error => {
        console.error('Erreur:', error);
        document.getElementById('emailError').textContent = error.message || 'Erreur lors de l\'inscription';
        document.getElementById('emailError').classList.add('active');
        hideLoading();
    });
});

// Gestionnaire de connexion
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!validateForm(this)) return;
    showLoading();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Appel API simulé
    apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    })
    .then(data => {
        if (data.token) {
            currentUser = data.user;

            const successDiv = document.createElement('div');
            successDiv.className = 'success-message';
            successDiv.textContent = 'Connexion réussie ! Redirection...';
            this.parentNode.insertBefore(successDiv, this);

            updateNavForLoggedUser();
            if (currentUser.type === 'tenant') {
                document.getElementById('tenantName').textContent = currentUser.name;
                showScreen('tenantDashboard');
            } else {
                document.getElementById('ownerName').textContent = currentUser.name;
                showScreen('ownerDashboard');
            }
            
            // Charger les données initiales
            loadInitialData();
        }
        hideLoading();
    })
    .catch(error => {
        console.error('Erreur:', error);
        document.getElementById('loginPasswordError').textContent = error.message || 'Email ou mot de passe incorrect';
        document.getElementById('loginPasswordError').classList.add('active');
        hideLoading();
    });
});

// Mettre à jour la navigation pour les utilisateurs connectés
function updateNavForLoggedUser() {
    const authNavItems = document.getElementById('authNavItems');
    if (currentUser) {
        authNavItems.innerHTML = `
            <a href="#" onclick="showDashboard()">Tableau de bord</a>
            <a href="#" onclick="showScreen('messages')">Messages</a>
            <a href="#" onclick="showScreen('profile')">Profil</a>
            <a href="#" onclick="logout()">Déconnexion</a>
        `;
    } else {
        authNavItems.innerHTML = `
            <a href="#" onclick="showScreen('login')">Connexion</a>
            <a href="#" onclick="showScreen('register')">Inscription</a>
        `;
    }
}

// Afficher le tableau de bord
function showDashboard() {
    if (currentUser) {
        showScreen(currentUser.type + 'Dashboard');
    }
}

// Gestionnaire de déconnexion
function logout() {
    showLoading();
    
    // Appel API pour déconnexion
    apiCall('/api/auth/logout')
    .finally(() => {
        currentUser = null;
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        updateNavForLoggedUser();
        showScreen('welcome');
        // Réinitialiser les formulaires
        document.getElementById('registerForm').reset();
        document.getElementById('loginForm').reset();
        // Réinitialiser la sélection du type d'utilisateur
        document.querySelectorAll('.user-type-option').forEach(opt => {
            opt.classList.remove('active');
        });
        document.querySelector('.user-type-option[data-type="tenant"]').classList.add('active');
        userType = 'tenant';
        hideLoading();
    });
}

// Charger les données du profil
async function loadProfileData() {
    if (!currentUser) return;

    try {
        showLoading();
        // Récupérer les données à jour de l'utilisateur
        const userData = await apiCall('/api/auth/me');
        currentUser = userData;
        
        document.getElementById('profileName').textContent = currentUser.name;
        document.getElementById('profileType').textContent = currentUser.type === 'tenant' ? 'Locataire' : 'Propriétaire';
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profilePhone').textContent = currentUser.phone;

        document.getElementById('profileFullName').value = currentUser.name;
        document.getElementById('profilePhoneNumber').value = currentUser.phone;
        document.getElementById('profileEmailAddress').value = currentUser.email;
        document.getElementById('profileBio').value = currentUser.bio || '';

        // Charger l'avatar s'il existe
        if (currentUser.avatar) {
            document.getElementById('avatarPreview').src = currentUser.avatar;
            document.getElementById('profileAvatar').src = currentUser.avatar;
        }

        // Charger les préférences
        if (currentUser.preferences) {
            document.getElementById('emailNotifications').checked = currentUser.preferences.emailNotifications;
            document.getElementById('smsNotifications').checked = currentUser.preferences.smsNotifications;
            document.getElementById('whatsappNotifications').checked = currentUser.preferences.whatsappNotifications;
            document.getElementById('language').value = currentUser.preferences.language;
        }

        // Ajouter conditionnellement les onglets en fonction du type d'utilisateur
        const tabsContainer = document.getElementById('profileTabs');
        tabsContainer.innerHTML = `
            <div class="profile-tab active" data-tab="edit">Modifier le profil</div>
            <div class="profile-tab" data-tab="security">Sécurité</div>
            <div class="profile-tab" data-tab="preferences">Préférences</div>
        `;
        if (currentUser.type === 'owner') {
            tabsContainer.innerHTML += `
                <div class="profile-tab" data-tab="publications">Mes publications</div>
            `;
        } else if (currentUser.type === 'tenant') {
            tabsContainer.innerHTML += `
                <div class="profile-tab" data-tab="favorites">Mes favoris</div>
                <div class="profile-tab" data-tab="visits">Mes visites</div>
            `;
        }

        // Réattacher les écouteurs d'événements aux nouveaux onglets
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                document.querySelectorAll('.profile-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(tabId + 'Tab').classList.add('active');
                if (tabId === 'publications') {
                    loadProfilePublications();
                } else if (tabId === 'favorites') {
                    loadProfileFavorites();
                } else if (tabId === 'visits') {
                    loadProfileVisits();
                }
            });
        });
        
        hideLoading();
    } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        hideLoading();
    }
}

// Charger les données du profil utilisateur (public)
async function loadUserProfileData(userId) {
    try {
        showLoading();
        const user = await apiCall(`/api/users/${userId}`);
        
        document.getElementById('userProfileName').textContent = user.name;
        document.getElementById('userProfileType').textContent = user.type === 'tenant' ? 'Locataire' : 'Propriétaire';
        document.getElementById('userProfileEmail').textContent = user.email;
        document.getElementById('userProfilePhone').textContent = user.phone;
        document.getElementById('userProfileBio').textContent = user.bio || 'Aucune bio disponible.';

        // Charger l'avatar
        document.getElementById('userProfileAvatar').src = user.avatar || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' fill='%233b82f6'/><text x='60' y='70' font-family='Arial' font-size='40' fill='white' text-anchor='middle'>${user.name.charAt(0).toUpperCase()}</text></svg>`;

        // Charger les publications si propriétaire
        const publicationsContainer = document.getElementById('userProfilePublications');
        publicationsContainer.innerHTML = '';
        if (user.type === 'owner') {
            const userProperties = await apiCall(`/api/users/${userId}/properties`);
            userProperties.forEach(property => {
                const propertyCard = createPropertyCard(property, false);
                publicationsContainer.appendChild(propertyCard);
            });
        } else {
            publicationsContainer.innerHTML = '<p class="text-center">Ce utilisateur n\'a pas de publications.</p>';
        }
        
        hideLoading();
    } catch (error) {
        console.error('Erreur lors du chargement du profil utilisateur:', error);
        hideLoading();
    }
}

// Charger les publications du profil
async function loadProfilePublications() {
    if (!currentUser || currentUser.type !== 'owner') return;

    try {
        showLoading();
        const userProperties = await apiCall('/api/properties/my-properties');
        
        const publicationsContainer = document.getElementById('profilePublications');
        publicationsContainer.innerHTML = '';

        userProperties.forEach(property => {
            const propertyCard = createPropertyCard(property, true);
            publicationsContainer.appendChild(propertyCard);
        });
        
        hideLoading();
    } catch (error) {
        console.error('Erreur lors du chargement des publications:', error);
        hideLoading();
    }
}

// Charger les favoris du profil
async function loadProfileFavorites() {
    if (!currentUser || currentUser.type !== 'tenant') return;

    try {
        showLoading();
        const favoriteProperties = await apiCall('/api/users/favorites');
        
        const favoritesContainer = document.getElementById('profileFavorites');
        favoritesContainer.innerHTML = '';

        if (favoriteProperties.length === 0) {
            favoritesContainer.innerHTML = '<p class="text-center">Aucun favori pour le moment.</p>';
            return;
        }

        favoriteProperties.forEach(property => {
            const propertyCard = createPropertyCard(property, false);
            favoritesContainer.appendChild(propertyCard);
        });
        
        hideLoading();
    } catch (error) {
        console.error('Erreur lors du chargement des favoris:', error);
        hideLoading();
    }
}

// Charger les visites du profil
async function loadProfileVisits() {
    if (!currentUser || currentUser.type !== 'tenant') return;

    try {
        showLoading();
        const userVisits = await apiCall('/api/visits/my-visits');
        
        const visitsContainer = document.getElementById('profileVisits');
        visitsContainer.innerHTML = '';

        if (userVisits.length === 0) {
            visitsContainer.innerHTML = '<p class="text-center">Aucune visite programmée.</p>';
            return;
        }

        for (const visit of userVisits) {
            const property = await apiCall(`/api/properties/${visit.propertyId}`);
            
            const visitCard = document.createElement('div');
            visitCard.className = 'visit-card';
            visitCard.innerHTML = `
                <div class="visit-header">
                    <h4>${property.title}</h4>
                    <span class="visit-status status-${visit.status || 'pending'}">${getStatusText(visit.status)}</span>
                </div>
                <p><strong>Date:</strong> ${new Date(visit.date).toLocaleDateString('fr-FR')} à ${visit.time}</p>
                <p><strong>Adresse:</strong> ${property.address}, ${property.city}</p>
                ${visit.message ? `<p><strong>Message:</strong> ${visit.message}</p>` : ''}
                ${visit.ownerResponse ? `<p><strong>Réponse du propriétaire:</strong> ${visit.ownerResponse}</p>` : ''}
            `;
            visitsContainer.appendChild(visitCard);
        }
        
        hideLoading();
    } catch (error) {
        console.error('Erreur lors du chargement des visites:', error);
        hideLoading();
    }
}

// Gérer le téléchargement d'avatar
function handleAvatarUpload(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.match('image.*')) {
        alert('Veuillez sélectionner une image valide (JPG, PNG ou GIF).');
        return;
    }

    if (file.size > 1000000) {
        alert('L\'image ne doit pas dépasser 1MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        currentAvatar = e.target.result;
        document.getElementById('avatarPreview').src = currentAvatar;
    };
    reader.readAsDataURL(file);
}

// Mettre à jour le profil
async function updateProfile() {
    if (!currentUser) return;

    const fullName = document.getElementById('profileFullName').value.trim();
    const phone = document.getElementById('profilePhoneNumber').value.trim();
    const email = document.getElementById('profileEmailAddress').value.trim();
    const bio = document.getElementById('profileBio').value.trim();

    try {
        const updateData = {
            name: fullName,
            phone: phone,
            email: email,
            bio: bio
        };

        if (currentAvatar) {
            updateData.avatar = currentAvatar;
        }

        const updatedUser = await apiCall('/api/users/profile', {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });

        currentUser = updatedUser;
        
        // Mettre à jour les noms des tableaux de bord
        if (currentUser.type === 'tenant') {
            document.getElementById('tenantName').textContent = fullName;
        } else {
            document.getElementById('ownerName').textContent = fullName;
        }

        alert('Profil mis à jour avec succès!');
        loadProfileData();
        hideLoading();
    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        alert('Erreur lors de la mise à jour du profil');
        hideLoading();
    }
}

// Mettre à jour le mot de passe
async function updatePassword() {
    if (!currentUser) return;

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
        document.getElementById('confirmNewPasswordError').textContent = 'Les mots de passe ne correspondent pas';
        document.getElementById('confirmNewPasswordError').classList.add('active');
        hideLoading();
        return;
    }

    try {
        await apiCall('/api/users/change-password', {
            method: 'POST',
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        document.getElementById('securityForm').reset();
        alert('Mot de passe mis à jour avec succès!');
        hideLoading();
    } catch (error) {
        console.error('Erreur lors de la mise à jour du mot de passe:', error);
        document.getElementById('currentPasswordError').textContent = error.message || 'Erreur lors de la mise à jour du mot de passe';
        document.getElementById('currentPasswordError').classList.add('active');
        hideLoading();
    }
}

// Mettre à jour les préférences
async function updatePreferences() {
    if (!currentUser) return;

    const emailNotifications = document.getElementById('emailNotifications').checked;
    const smsNotifications = document.getElementById('smsNotifications').checked;
    const whatsappNotifications = document.getElementById('whatsappNotifications').checked;
    const language = document.getElementById('language').value;

    try {
        await apiCall('/api/users/preferences', {
            method: 'PUT',
            body: JSON.stringify({
                emailNotifications,
                smsNotifications,
                whatsappNotifications,
                language
            })
        });

        alert('Préférences mises à jour avec succès!');
        hideLoading();
    } catch (error) {
        console.error('Erreur lors de la mise à jour des préférences:', error);
        alert('Erreur lors de la mise à jour des préférences');
        hideLoading();
    }
}

// Charger les propriétés du propriétaire
async function loadOwnerProperties() {
    showLoading();
    
    try {
        const userProperties = await apiCall('/api/properties/my-properties');
        const ownerPropertiesContainer = document.getElementById('ownerProperties');
        const ownerPropertiesCount = document.getElementById('ownerPropertiesCount');
        const ownerViewsCount = document.getElementById('ownerViewsCount');
        const ownerMessagesCount = document.getElementById('ownerMessagesCount');
        const ownerVisitsCount = document.getElementById('ownerVisitsCount');
        
        ownerPropertiesCount.textContent = userProperties.length;

        // Calculer les statistiques
        const totalViews = userProperties.reduce((sum, p) => sum + (p.views || 0), 0);
        ownerViewsCount.textContent = totalViews;

        const ownerConversations = await apiCall('/api/conversations/my-conversations');
        ownerMessagesCount.textContent = ownerConversations.length;

        const ownerVisitRequests = await apiCall('/api/visits/my-property-visits');
        ownerVisitsCount.textContent = ownerVisitRequests.length;

        ownerPropertiesContainer.innerHTML = '';

        if (userProperties.length === 0) {
            ownerPropertiesContainer.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1; padding: 2rem;">
                    <p>Vous n'avez pas encore de propriétés.</p>
                    <button class="btn btn-primary mt-2" onclick="showAddPropertyForm()">Ajouter votre première propriété</button>
                </div>
            `;
            return;
        }

        userProperties.forEach(property => {
            const propertyCard = createPropertyCard(property, true);
            ownerPropertiesContainer.appendChild(propertyCard);
        });
        
        hideLoading();
    } catch (error) {
        console.error('Erreur lors du chargement des propriétés:', error);
        hideLoading();
    }
}

// Charger les propriétés du locataire
async function loadTenantProperties() {
    showLoading();
    
    try {
        const availableProperties = await apiCall('/api/properties');
        const tenantPropertiesContainer = document.getElementById('tenantProperties');
        const tenantFavoritesCount = document.getElementById('tenantFavoritesCount');
        const tenantVisitsCount = document.getElementById('tenantVisitsCount');
        const tenantMessagesCount = document.getElementById('tenantMessagesCount');
        
        tenantPropertiesContainer.innerHTML = '';

        if (availableProperties.length === 0) {
            tenantPropertiesContainer.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1; padding: 2rem;">
                    <p>Aucune propriété disponible pour le moment.</p>
                </div>
            `;
            return;
        }

        availableProperties.forEach(property => {
            const propertyCard = createPropertyCard(property, false);
            tenantPropertiesContainer.appendChild(propertyCard);
        });

        // Mettre à jour les statistiques
        const favorites = await apiCall('/api/users/favorites');
        tenantFavoritesCount.textContent = favorites.length;

        const userVisits = await apiCall('/api/visits/my-visits');
        tenantVisitsCount.textContent = userVisits.length;

        const userConversations = await apiCall('/api/conversations/my-conversations');
        tenantMessagesCount.textContent = userConversations.length;
        
        hideLoading();
    } catch (error) {
        console.error('Erreur lors du chargement des propriétés:', error);
        hideLoading();
    }
}

// Charger les résultats de recherche
async function loadSearchResults() {
    showLoading();
    
    try {
        const availableProperties = await apiCall('/api/properties');
        const searchResultsContainer = document.getElementById('searchResults');
        const resultsCount = document.getElementById('resultsCount');
        
        searchResultsContainer.innerHTML = '';

        if (availableProperties.length === 0) {
            searchResultsContainer.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1; padding: 2rem;">
                    <p>Aucune propriété disponible pour le moment.</p>
                </div>
            `;
            resultsCount.textContent = '0 résultat';
            return;
        }

        availableProperties.forEach(property => {
            const propertyCard = createPropertyCard(property, false);
            searchResultsContainer.appendChild(propertyCard);
        });
        
        resultsCount.textContent = `${availableProperties.length} résultat${availableProperties.length > 1 ? 's' : ''}`;
        
        hideLoading();
    } catch (error) {
        console.error('Erreur lors du chargement des résultats de recherche:', error);
        hideLoading();
    }
}

// Effectuer une recherche avec filtres et tri
async function performSearch() {
    showLoading();
    
    try {
        const city = document.getElementById('searchCity').value.toLowerCase();
        const type = document.getElementById('searchType').value;
        const minPrice = document.getElementById('searchMinPrice').value;
        const maxPrice = document.getElementById('searchMaxPrice').value;
        const minSurface = document.getElementById('searchMinSurface').value;
        const bedrooms = document.getElementById('searchBedrooms').value;
        const amenities = Array.from(document.querySelectorAll('input[name="searchAmenity"]:checked')).map(cb => cb.value);
        const sortBy = document.getElementById('sortBy').value;

        // Construire l'URL avec les paramètres
        const params = new URLSearchParams();
        if (city) params.append('city', city);
        if (type) params.append('type', type);
        if (minPrice) params.append('minPrice', minPrice);
        if (maxPrice) params.append('maxPrice', maxPrice);
        if (minSurface) params.append('minSurface', minSurface);
        if (bedrooms) params.append('bedrooms', bedrooms);
        amenities.forEach(a => params.append('amenities', a));
        if (sortBy) params.append('sortBy', sortBy);

        const filteredProperties = await apiCall(`/api/properties?${params.toString()}`);
        const searchResultsContainer = document.getElementById('searchResults');
        const resultsCount = document.getElementById('resultsCount');
        
        searchResultsContainer.innerHTML = '';

        if (filteredProperties.length === 0) {
            searchResultsContainer.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1; padding: 2rem;">
                    <p>Aucun résultat ne correspond à vos critères de recherche.</p>
                </div>
            `;
            resultsCount.textContent = '0 résultat';
            return;
        }

        filteredProperties.forEach(property => {
            const propertyCard = createPropertyCard(property, false);
            searchResultsContainer.appendChild(propertyCard);
        });
        
        resultsCount.textContent = `${filteredProperties.length} résultat${filteredProperties.length > 1 ? 's' : ''}`;
        
        hideLoading();
    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        hideLoading();
    }
}

// Sauvegarder les critères de recherche
async function saveSearchCriteria() {
    if (!currentUser || currentUser.type !== 'tenant') return;

    const criteria = {
        city: document.getElementById('searchCity').value,
        type: document.getElementById('searchType').value,
        minPrice: document.getElementById('searchMinPrice').value,
        maxPrice: document.getElementById('searchMaxPrice').value,
        minSurface: document.getElementById('searchMinSurface').value,
        bedrooms: document.getElementById('searchBedrooms').value,
        amenities: Array.from(document.querySelectorAll('input[name="searchAmenity"]:checked')).map(cb => cb.value)
    };

    try {
        await apiCall('/api/users/saved-searches', {
            method: 'POST',
            body: JSON.stringify(criteria)
        });

        alert('Recherche sauvegardée ! Vous recevrez des alertes pour les nouvelles propriétés correspondantes.');
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la recherche:', error);
        alert('Erreur lors de la sauvegarde de la recherche');
    }
}

// Créer une carte de propriété
function createPropertyCard(property, isOwner = false) {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.dataset.id = property.id;

    const statusClass = property.status === 'available' ? 'status-available' : 'status-rented';
    const statusText = property.status === 'available' ? 'Disponible' : 'Loué';

    // Générer un placeholder si aucune image
    const imagePlaceholder = property.type === 'maison' ? '🏠' :
                             property.type === 'studio' ? '🔨' : '🏢';

    // Calculer la note moyenne
    const reviews = property.reviews || [];
    const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length).toFixed(1) : 0;
    const starsHtml = '<i class="fas fa-star"></i>'.repeat(Math.floor(avgRating)) + (avgRating % 1 > 0 ? '<i class="fas fa-star-half-alt"></i>' : '') + '<i class="far fa-star"></i>'.repeat(5 - Math.ceil(avgRating));

    // Vérifier si la propriété est dans les favoris
    const favorites = getStorageData(STORAGE_KEYS.FAVORITES);
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    const isFavorited = currentUser && currentUser.type === 'tenant' && 
                       favorites.some(f => f.userId === currentUser.id && f.propertyId === property.id);

    // Créer le HTML des équipements
    let amenitiesHtml = '';
    if (property.amenities && property.amenities.length > 0) {
        amenitiesHtml = '<div class="property-amenities">';
        property.amenities.forEach(amenity => {
            let icon = '';
            let label = '';
            switch(amenity) {
                case 'wifi': icon = '📶'; label = 'Wi-Fi'; break;
                case 'parking': icon = '🚗'; label = 'Parking'; break;
                case 'piscine': icon = '🏊'; label = 'Piscine'; break;
                case 'gym': icon = '💪'; label = 'Salle de sport'; break;
                case 'climatisation': icon = '❄️'; label = 'Climatisation'; break;
            }
            amenitiesHtml += `<span class="amenity-tag">${icon} ${label}</span>`;
        });
        amenitiesHtml += '</div>';
    }

    card.innerHTML = `
        <div class="property-image">
            ${property.images && property.images.length > 0 ?
                `<img src="${property.images[0]}" alt="${property.title}">` :
                `<div class="property-image-placeholder">${imagePlaceholder}</div>`}
            <span class="property-status ${statusClass}">${statusText}</span>
        </div>
        <div class="property-content">
            <h4 class="property-title">${property.title}</h4>
            <div class="property-rating">
                <span class="stars">${starsHtml}</span>
                <span>(${reviews.length} avis)</span>
            </div>
            <div class="property-price">${property.price.toLocaleString('fr-DZ')} DZD/mois</div>
            <div class="property-details">
                <span>📐 ${property.surface}m²</span>
                <span>🛏️ ${property.bedrooms} ch</span>
                <span>🚿 ${property.bathrooms} sdb</span>
            </div>
            ${amenitiesHtml}
            <p class="property-description">${property.description.substring(0, 100)}...</p>
            ${!isOwner ? `<p class="property-whatsapp"><i class="fab fa-whatsapp"></i> ${property.whatsapp}</p>` : ''}
            <div class="form-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                ${isOwner ? `
                    <button class="btn btn-primary" onclick="viewProperty('${property.id}')">Voir</button>
                    <button class="btn btn-secondary" onclick="editProperty('${property.id}')">Modifier</button>
                    <button class="btn" onclick="deleteProperty('${property.id}')" style="background: var(--error-color); color: white;">Supprimer</button>
                ` : `
                    <button class="btn btn-primary" onclick="viewProperty('${property.id}')">Voir détails</button>
                    <button class="btn btn-whatsapp" onclick="contactOwner('${property.id}')">
                        <i class="fab fa-whatsapp"></i> Contacter
                    </button>
                    <button class="btn btn-secondary" onclick="startConversation('${property.id}')">Message</button>
                    ${currentUser && currentUser.type === 'tenant' ? `
                        <button class="btn btn-favorite ${isFavorited ? 'active' : ''}" onclick="toggleFavorite('${property.id}')">
                            ${isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        </button>
                    ` : ''}
                `}
            </div>
        </div>
    `;

    return card;
}

// Basculer les favoris
async function toggleFavorite(propertyId) {
    if (!currentUser || currentUser.type !== 'tenant') return;

    showLoading();
    
    try {
        await apiCall('/api/users/toggle-favorite', {
            method: 'POST',
            body: JSON.stringify({ propertyId })
        });

        // Recharger l'écran actuel
        if (document.getElementById('tenantDashboard').classList.contains('active')) {
            loadTenantProperties();
        } else if (document.getElementById('search').classList.contains('active')) {
            performSearch();
        } else if (document.getElementById('profile').classList.contains('active')) {
            loadProfileFavorites();
        }
        
        hideLoading();
    } catch (error) {
        console.error('Erreur lors de l\'ajout aux favoris:', error);
        hideLoading();
    }
}

// Afficher le formulaire d'ajout de propriété
function showAddPropertyForm() {
    document.getElementById('propertyFormTitle').textContent = 'Ajouter une propriété';
    document.getElementById('propertyId').value = '';
    document.getElementById('propertyForm').reset();
    document.getElementById('imagePreviewContainer').innerHTML = '';
    currentPropertyImages = [];
    // Réinitialiser les équipements
    document.querySelectorAll('input[name="amenity"]').forEach(cb => cb.checked = false);
    showScreen('propertyFormScreen');
}

// Modifier la propriété
function editProperty(propertyId) {
    const property = getStorageData(STORAGE_KEYS.PROPERTIES).find(p => p.id === propertyId);
    if (!property) return;

    document.getElementById('propertyFormTitle').textContent = 'Modifier la propriété';
    document.getElementById('propertyId').value = property.id;
    document.getElementById('propertyTitle').value = property.title;
    document.getElementById('propertyPrice').value = property.price;
    document.getElementById('propertyType').value = property.type;
    document.getElementById('propertyStatus').value = property.status;
    document.getElementById('propertySurface').value = property.surface;
    document.getElementById('propertyRooms').value = property.rooms;
    document.getElementById('propertyBedrooms').value = property.bedrooms;
    document.getElementById('propertyBathrooms').value = property.bathrooms;
    document.getElementById('propertyAddress').value = property.address;
    document.getElementById('propertyCity').value = property.city;
    document.getElementById('propertyWhatsApp').value = property.whatsapp;
    document.getElementById('propertyDescription').value = property.description;

    // Charger les équipements
    document.querySelectorAll('input[name="amenity"]').forEach(cb => {
        cb.checked = property.amenities.includes(cb.value);
    });

    // Charger les images
    document.getElementById('imagePreviewContainer').innerHTML = '';
    currentPropertyImages = property.images || [];
    if (currentPropertyImages.length > 0) {
        currentPropertyImages.forEach((image, index) => {
            addImagePreview(image, index);
        });
    }

    showScreen('propertyFormScreen');
}

// Gérer le téléchargement d'image
function handleImageUpload(files) {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.match('image.*')) continue;

        const reader = new FileReader();
        reader.onload = function(e) {
            currentPropertyImages.push(e.target.result);
            addImagePreview(e.target.result, currentPropertyImages.length - 1);
        };
        reader.readAsDataURL(file);
    }
}

// Ajouter un aperçu d'image
function addImagePreview(imageSrc, index) {
    const previewContainer = document.getElementById('imagePreviewContainer');
    const preview = document.createElement('div');
    preview.className = 'image-preview';
    preview.innerHTML = `
        <img src="${imageSrc}" alt="Preview ${index + 1}">
        <div class="remove-image" onclick="removeImage(${index})">
            <i class="fas fa-times"></i>
        </div>
    `;
    previewContainer.appendChild(preview);
}

// Supprimer une image
function removeImage(index) {
    currentPropertyImages.splice(index, 1);
    document.getElementById('imagePreviewContainer').innerHTML = '';
    currentPropertyImages.forEach((image, i) => {
        addImagePreview(image, i);
    });
}

// Annuler la modification de propriété
function cancelPropertyEdit() {
    showScreen('ownerDashboard');
}

// Soumission du formulaire de propriété
document.getElementById('propertyForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!validateForm(this)) return;
    showLoading();
    
    const propertyId = document.getElementById('propertyId').value;
    const title = document.getElementById('propertyTitle').value;
    const price = parseInt(document.getElementById('propertyPrice').value);
    const type = document.getElementById('propertyType').value;
    const status = document.getElementById('propertyStatus').value;
    const surface = parseInt(document.getElementById('propertySurface').value);
    const rooms = parseInt(document.getElementById('propertyRooms').value);
    const bedrooms = parseInt(document.getElementById('propertyBedrooms').value);
    const bathrooms = parseInt(document.getElementById('propertyBathrooms').value);
    const address = document.getElementById('propertyAddress').value;
    const city = document.getElementById('propertyCity').value;
    const whatsapp = document.getElementById('propertyWhatsApp').value;
    const description = document.getElementById('propertyDescription').value;
    const amenities = Array.from(document.querySelectorAll('input[name="amenity"]:checked')).map(cb => cb.value);

    const propertyData = {
        title,
        price,
        type,
        status,
        surface,
        rooms,
        bedrooms,
        bathrooms,
        address,
        city,
        whatsapp,
        description,
        images: currentPropertyImages,
        amenities
    };

    const endpoint = propertyId ? `/api/properties/${propertyId}` : '/api/properties';
    const method = propertyId ? 'PUT' : 'POST';

    apiCall(endpoint, {
        method: method,
        body: JSON.stringify(propertyData)
    })
    .then(() => {
        alert(propertyId ? 'Propriété modifiée avec succès!' : 'Propriété ajoutée avec succès!');
        showScreen('ownerDashboard');
        hideLoading();
    })
    .catch(error => {
        console.error('Erreur lors de la sauvegarde de la propriété:', error);
        alert('Erreur lors de la sauvegarde de la propriété');
        hideLoading();
    });
});

// Supprimer une propriété
async function deleteProperty(propertyId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette propriété ? Cela supprimera aussi les messages associés.')) return;

    showLoading();
    
    try {
        await apiCall(`/api/properties/${propertyId}`, {
            method: 'DELETE'
        });

        alert('Propriété supprimée avec succès!');
        loadOwnerProperties();
        hideLoading();
    } catch (error) {
        console.error('Erreur lors de la suppression de la propriété:', error);
        alert('Erreur lors de la suppression de la propriété');
        hideLoading();
    }
}

// Voir les détails de la propriété
async function viewProperty(propertyId) {
    showLoading();
    
    try {
        const property = await apiCall(`/api/properties/${propertyId}`);
        
        // Incrémenter les vues
        await apiCall(`/api/properties/${propertyId}/view`, {
            method: 'POST'
        });

        modalPropertyOwnerId = property.ownerId;
        modalPropertyId = propertyId;

        document.getElementById('modalPropertyTitle').textContent = property.title;
        document.getElementById('modalPropertyPrice').textContent = `${property.price.toLocaleString('fr-DZ')} DZD/mois`;
        document.getElementById('modalPropertyAddress').textContent = property.address;
        document.getElementById('modalPropertyCity').textContent = property.city;
        document.getElementById('modalPropertyType').textContent = property.type.charAt(0).toUpperCase() + property.type.slice(1);
        document.getElementById('modalPropertyStatus').textContent = property.status === 'available' ? 'Disponible' : 'Loué';
        document.getElementById('modalPropertyWhatsApp').textContent = property.whatsapp;
        document.getElementById('modalPropertyDescription').textContent = property.description;

        const detailsHtml = `
            <span>📐 ${property.surface}m²</span>
            <span>🏠 ${property.rooms} pièces</span>
            <span>🛏️ ${property.bedrooms} ch</span>
            <span>🚿 ${property.bathrooms} sdb</span>
        `;
        document.getElementById('modalPropertyDetails').innerHTML = detailsHtml;

        const thumbnailsContainer = document.getElementById('modalThumbnails');
        thumbnailsContainer.innerHTML = '';

        if (property.images && property.images.length > 0) {
            document.getElementById('modalMainImage').src = property.images[0];
            property.images.forEach((image, index) =>{
                const thumb = document.createElement('div');
                thumb.className = 'modal-thumbnail' + (index === 0 ? ' active' : '');
                thumb.innerHTML = `<img src="${image}" alt="Thumbnail ${index + 1}">`;
                thumb.onclick = () => {
                    document.getElementById('modalMainImage').src = image;
                    document.querySelectorAll('.modal-thumbnail').forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                };
                thumbnailsContainer.appendChild(thumb);
            });
        } else {
            document.getElementById('modalMainImage').src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23' + (isDarkMode ? '374151' : 'f3f4f6') + '"/><text x="200" y="150" font-family="Arial" font-size="20" fill="%23' + (isDarkMode ? '9ca3af' : '6b7280') + '" text-anchor="middle">Image non disponible</text></svg>';
        }

        // Charger les avis
        loadModalReviews(propertyId);

        document.getElementById('propertyModal').classList.add('active');
        hideLoading();
    } catch (error) {
        console.error('Erreur lors du chargement de la propriété:', error);
        hideLoading();
    }
}

// Charger les avis modaux
async function loadModalReviews(propertyId) {
    const reviewsList = document.getElementById('modalReviewsList');
    reviewsList.innerHTML = '';

    try {
        const property = await apiCall(`/api/properties/${propertyId}`);
        
        if (!property.reviews || property.reviews.length === 0) {
            reviewsList.innerHTML = '<p class="text-center">Aucun avis pour le moment.</p>';
            return;
        }

        for (const review of property.reviews) {
            const reviewCard = document.createElement('div');
            reviewCard.className = 'review-card';
            reviewCard.innerHTML = `
                <div class="review-stars">${'<i class="fas fa-star"></i>'.repeat(review.stars)}</div>
                <div class="review-comment">${review.comment}</div>
                <p class="text-right" style="font-size: 0.8rem; color: var(--text-secondary);">${review.userName} - ${new Date(review.date).toLocaleDateString('fr-FR')}</p>
            `;
            reviewsList.appendChild(reviewCard);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des avis:', error);
        reviewsList.innerHTML = '<p class="text-center">Erreur lors du chargement des avis.</p>';
    }
}

// Soumettre un avis
async function submitReview() {
    if (!currentUser) {
        alert('Veuillez vous connecter pour laisser un avis.');
        return;
    }

    if (currentReviewStars === 0) {
        alert("Veuillez sélectionner un nombre d'étoiles.");
        return;
    }

    const comment = document.getElementById('reviewComment').value.trim();
    if (!comment) {
        alert('Veuillez entrer un commentaire.');
        return;
    }

    showLoading();
    
    try {
        await apiCall(`/api/properties/${modalPropertyId}/reviews`, {
            method: 'POST',
            body: JSON.stringify({
                stars: currentReviewStars,
                comment: comment
            })
        });

        // Réinitialiser le formulaire
        document.getElementById('reviewComment').value = '';
        currentReviewStars = 0;
        document.querySelectorAll('#reviewStars i').forEach(s => s.classList.remove('active'));

        // Recharger les avis
        loadModalReviews(modalPropertyId);
        alert('Avis envoyé avec succès!');
        hideLoading();
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'avis:', error);
        alert('Erreur lors de l\'envoi de l\'avis');
        hideLoading();
    }
}

// Fermer la modal
function closeModal() {
    document.getElementById('propertyModal').classList.remove('active');
    modalPropertyId = null;
}

// Planifier une visite
function scheduleVisit() {
    document.getElementById('visitModal').classList.add('active');
}

function closeVisitModal() {
    document.getElementById('visitModal').classList.remove('active');
}

async function submitVisit() {
    const date = document.getElementById('visitDate').value;
    const time = document.getElementById('visitTime').value;
    const message = document.getElementById('visitMessage').value.trim();

    if (!date || !time) {
        alert('Veuillez sélectionner une date et une heure.');
        return;
    }

    showLoading();
    
    try {
        await apiCall('/api/visits', {
            method: 'POST',
            body: JSON.stringify({
                propertyId: modalPropertyId,
                date: date,
                time: time,
                message: message
            })
        });

        alert('Demande de visite envoyée! Le propriétaire vous contactera bientôt.');
        closeVisitModal();
        hideLoading();
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la demande de visite:', error);
        alert('Erreur lors de l\'envoi de la demande de visite');
        hideLoading();
    }
}

// Voir le profil du propriétaire
function viewOwnerProfile(ownerId) {
    showScreen('userProfile', {userId: ownerId});
}

// Contacter le propriétaire via WhatsApp
async function contactOwner(propertyId) {
    try {
        const property = await apiCall(`/api/properties/${propertyId}`);
        const owner = await apiCall(`/api/users/${property.ownerId}`);

        currentWhatsAppProperty = {
            property: property,
            owner: owner
        };

        document.getElementById('whatsappPropertyTitle').textContent = property.title;
        document.getElementById('whatsappPropertyPrice').textContent = `${property.price.toLocaleString('fr-DZ')} DZD/mois`;
        document.getElementById('whatsappModal').classList.add('active');
    } catch (error) {
        console.error('Erreur lors du chargement des informations:', error);
        alert('Erreur lors du chargement des informations');
    }
}

// Ouvrir WhatsApp
function openWhatsApp() {
    if (!currentWhatsAppProperty) return;

    const { property, owner } = currentWhatsAppProperty;
    const message = `Bonjour, je suis intéressé(e) par votre propriété "${property.title}" à ${property.city} pour ${property.price.toLocaleString('fr-DZ')} DZD/mois. Pouvez-vous me donner plus d'informations ?`;
    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = property.whatsapp || owner.phone;
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
    closeWhatsAppModal();
}

// Fermer la modal WhatsApp
function closeWhatsAppModal() {
    document.getElementById('whatsappModal').classList.remove('active');
    currentWhatsAppProperty = null;
}

// Démarrer une conversation
async function startConversation(propertyId) {
    if (!currentUser) {
        alert('Veuillez vous connecter pour envoyer un message.');
        showScreen('login');
        return;
    }

    try {
        const property = await apiCall(`/api/properties/${propertyId}`);
        const owner = await apiCall(`/api/users/${property.ownerId}`);

        // Vérifier si la conversation existe déjà
        let conversation;
        try {
            conversation = await apiCall(`/api/conversations/property/${propertyId}/user/${owner.id}`);
        } catch (error) {
            // Si la conversation n'existe pas, en créer une nouvelle
            conversation = await apiCall('/api/conversations', {
                method: 'POST',
                body: JSON.stringify({
                    propertyId: propertyId,
                    otherUserId: owner.id
                })
            });
        }

        // Ouvrir le chat
        openChat(propertyId, owner.id);
    } catch (error) {
        console.error('Erreur lors du démarrage de la conversation:', error);
        alert('Erreur lors du démarrage de la conversation');
    }
}

// Ouvrir le chat
async function openChat(propertyId, otherUserId) {
    currentChat = {propertyId, otherUserId};

    try {
        const property = await apiCall(`/api/properties/${propertyId}`);
        const otherUser = await apiCall(`/api/users/${otherUserId}`);

        if (property && otherUser) {
            document.getElementById('chatWithUser').textContent = `Conversation avec ${otherUser.name}`;
            document.getElementById('chatPropertyTitle').textContent = property.title;
        }

        loadChatMessages();
        document.getElementById('chatModal').classList.add('active');
    } catch (error) {
        console.error('Erreur lors de l\'ouverture du chat:', error);
        alert('Erreur lors de l\'ouverture du chat');
    }
}

// Charger les messages du chat
async function loadChatMessages() {
    showLoading();
    
    try {
        const conversation = await apiCall(`/api/conversations/property/${currentChat.propertyId}/user/${currentChat.otherUserId}`);
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = '';

        if (!conversation.messages || conversation.messages.length === 0) {
            messagesContainer.innerHTML = '<p class="text-center">Aucun message pour le moment. Commencez la conversation!</p>';
            hideLoading();
            return;
        }

        // Afficher les messages
        conversation.messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = msg.senderId === currentUser.id ? 'message message-sent' : 'message message-received';

            const time = new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

            messageDiv.innerHTML = `
                <div>${msg.content}</div>
                <div class="message-time">${time}</div>
            `;

            messagesContainer.appendChild(messageDiv);
        });

        // Faire défiler vers le bas
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        hideLoading();
    } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
        hideLoading();
    }
}

// Envoyer un message de chat
async function sendChatMessage() {
    if (!currentUser) return;

    const input = document.getElementById('chatInput');
    const content = input.value.trim();

    if (!content) return;

    showLoading();
    
    try {
        await apiCall('/api/conversations/message', {
            method: 'POST',
            body: JSON.stringify({
                propertyId: currentChat.propertyId,
                otherUserId: currentChat.otherUserId,
                content: content
            })
        });

        // Effacer l'entrée et recharger les messages
        input.value = '';
        loadChatMessages();

        // Mettre à jour la liste des conversations si sur l'écran des messages
        if (document.getElementById('messages').classList.contains('active')) {
            loadConversations();
        }
        
        hideLoading();
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        hideLoading();
    }
}

// Fermer la modal de chat
function closeChatModal() {
    document.getElementById('chatModal').classList.remove('active');
    document.getElementById('chatInput').value = '';
    currentChat = {propertyId: null, otherUserId: null};
}

// Charger les conversations
async function loadConversations() {
    showLoading();
    
    try {
        const userConversations = await apiCall('/api/conversations/my-conversations');
        const list = document.getElementById('conversationsList');
        list.innerHTML = '';

        if (userConversations.length === 0) {
            list.innerHTML = '<p class="text-center">Aucune conversation.</p>';
            hideLoading();
            return;
        }

        // Afficher les conversations
        for (const conv of userConversations) {
            const otherUserId = conv.user1Id === currentUser.id ? conv.user2Id : conv.user1Id;
            const otherUser = await apiCall(`/api/users/${otherUserId}`);
            const property = await apiCall(`/api/properties/${conv.propertyId}`);

            if (!otherUser || !property) continue;

            const lastMessage = conv.messages && conv.messages.length > 0
                ? conv.messages[conv.messages.length - 1]
                : null;

            const time = lastMessage
                ? new Date(lastMessage.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                : '';

            const conversationDiv = document.createElement('div');
            conversationDiv.className = 'conversation-card';
            conversationDiv.onclick = () => openChat(conv.propertyId, otherUserId);

            conversationDiv.innerHTML = `
                <div class="conversation-avatar">${otherUser.name.charAt(0).toUpperCase()}</div>
                <div class="conversation-info">
                    <div class="conversation-name">${otherUser.name}</div>
                    <div class="conversation-lastmsg">${property.title}</div>
                    ${lastMessage ? `<div class="conversation-lastmsg">${lastMessage.content}</div>` : ''}
                </div>
                <div class="conversation-time">${time}</div>
            `;

            list.appendChild(conversationDiv);
        }
        
        hideLoading();
    } catch (error) {
        console.error('Erreur lors du chargement des conversations:', error);
        hideLoading();
    }
}

// Charger les demandes de visite
async function loadVisitRequests() {
    showLoading();
    
    try {
        let visitRequests = [];
        if (currentUser.type === 'owner') {
            visitRequests = await apiCall('/api/visits/my-property-visits');
        } else if (currentUser.type === 'tenant') {
            visitRequests = await apiCall('/api/visits/my-visits');
        }

        const list = document.getElementById('visitsList');
        list.innerHTML = '';

        if (visitRequests.length === 0) {
            list.innerHTML = '<p class="text-center">Aucune demande de visite.</p>';
            hideLoading();
            return;
        }

        // Afficher les demandes de visite
        for (const visit of visitRequests) {
            const property = await apiCall(`/api/properties/${visit.propertyId}`);
            
            if (!property) continue;

            const visitCard = document.createElement('div');
            visitCard.className = 'visit-card';

            if (currentUser.type === 'owner') {
                const user = await apiCall(`/api/users/${visit.userId}`);
                
                // Vue propriétaire - afficher les informations de l'utilisateur et les boutons d'action
                visitCard.innerHTML = `
                    <div class="visit-header">
                        <h4>${property.title}</h4>
                        <span class="visit-status status-${visit.status || 'pending'}">${getStatusText(visit.status)}</span>
                    </div>
                    <p><strong>Demandeur:</strong> ${user ? user.name : 'Utilisateur inconnu'}</p>
                    <p><strong>Date demandée:</strong> ${new Date(visit.date).toLocaleDateString('fr-FR')} à ${visit.time}</p>
                    <p><strong>Adresse:</strong> ${property.address}, ${property.city}</p>
                    ${visit.message ? `<p><strong>Message:</strong> ${visit.message}</p>` : ''}
                    ${visit.status === 'pending' ? `
                        <div class="visit-actions">
                            <button class="btn btn-primary" onclick="respondToVisit('${visit.id}', 'accepted')">Accepter</button>
                            <button class="btn" style="background: var(--error-color); color: white;" onclick="respondToVisit('${visit.id}', 'rejected')">Refuser</button>
                        </div>
                    ` : ''}
                    ${visit.ownerResponse ? `<p><strong>Votre réponse:</strong> ${visit.ownerResponse}</p>` : ''}
                `;
            } else {
                // Vue locataire - afficher les informations sur la propriété et le statut
                visitCard.innerHTML = `
                    <div class="visit-header">
                        <h4>${property.title}</h4>
                        <span class="visit-status status-${visit.status || 'pending'}">${getStatusText(visit.status)}</span>
                    </div>
                    <p><strong>Date demandée:</strong> ${new Date(visit.date).toLocaleDateString('fr-FR')} à ${visit.time}</p>
                    <p><strong>Adresse:</strong> ${property.address}, ${property.city}</p>
                    ${visit.message ? `<p><strong>Votre message:</strong> ${visit.message}</p>` : ''}
                    ${visit.ownerResponse ? `<p><strong>Réponse du propriétaire:</strong> ${visit.ownerResponse}</p>` : ''}
                `;
            }
            list.appendChild(visitCard);
        }
        
        hideLoading();
    } catch (error) {
        console.error('Erreur lors du chargement des demandes de visite:', error);
        hideLoading();
    }
}

// Répondre à une demande de visite
async function respondToVisit(visitId, response) {
    const responseText = prompt(response === 'accepted' ? 
        'Entrez un message de confirmation pour le locataire:' : 
        'Entrez un message pour expliquer votre refus:');

    if (responseText === null) return; // Utilisateur annulé

    showLoading();
    
    try {
        await apiCall(`/api/visits/${visitId}/respond`, {
            method: 'POST',
            body: JSON.stringify({
                status: response,
                response: responseText
            })
        });

        alert(`Demande de visite ${response === 'accepted' ? 'acceptée' : 'refusée'}!`);
        loadVisitRequests();
        hideLoading();
    } catch (error) {
        console.error('Erreur lors de la réponse à la demande de visite:', error);
        alert('Erreur lors de la réponse à la demande de visite');
        hideLoading();
    }
}

// Obtenir le texte du statut
function getStatusText(status) {
    switch(status) {
        case 'pending': return 'En attente';
        case 'accepted': return 'Acceptée';
        case 'rejected': return 'Refusée';
        default: return 'En attente';
    }
}

// Initialiser les données d'exemple
function initializeSampleData() {
    const users = getStorageData(STORAGE_KEYS.USERS);
    const properties = getStorageData(STORAGE_KEYS.PROPERTIES);
    
    // Si pas encore de données, créer des exemples
    if (users.length === 0) {
        const sampleUsers = [
            {
                id: '1',
                name: 'Jean Dupont',
                email: 'jean@example.com',
                phone: '0555123456',
                password: 'password123',
                type: 'owner',
                bio: 'Propriétaire sérieux avec plusieurs biens à Alger',
                avatar: null,
                preferences: {
                    emailNotifications: true,
                    smsNotifications: false,
                    whatsappNotifications: true,
                    language: 'fr'
                },
                createdAt: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Marie Martin',
                email: 'marie@example.com',
                phone: '0555654321',
                password: 'password123',
                type: 'tenant',
                bio: 'À la recherche d\'un logement spacieux dans Alger centre',
                avatar: null,
                preferences: {
                    emailNotifications: true,
                    smsNotifications: true,
                    whatsappNotifications: true,
                    language: 'fr'
                },
                createdAt: new Date().toISOString()
            }
        ];
        setStorageData(STORAGE_KEYS.USERS, sampleUsers);
    }

    if (properties.length === 0) {
        const sampleProperties = [
            {
                id: '1',
                title: 'Bel appartement centre ville Alger',
                price: 45000,
                type: 'appartement',
                status: 'available',
                surface: 75,
                rooms: 3,
                bedrooms: 2,
                bathrooms: 1,
                address: '123 Rue Didouche Mourad',
                city: 'Alger',
                whatsapp: '0555123456',
                description: 'Superbe appartement rénové au cœur d\'Alger, proche de tous les commerces et transports. Appartement lumineux avec vue sur la mer.',
                images: [],
                amenities: ['wifi', 'climatisation', 'parking'],
                ownerId: '1',
                ownerName: 'Jean Dupont',
                views: 12,
                createdAt: new Date().toISOString()
            },
            {
                id: '2',
                title: 'Villa moderne avec jardin',
                price: 120000,
                type: 'maison',
                status: 'available',
                surface: 180,
                rooms: 5,
                bedrooms: 3,
                bathrooms: 2,
                address: '45 Avenue des Frères Bouchama',
                city: 'Alger',
                whatsapp: '0555123456',
                description: 'Magnifique villa moderne avec grand jardin, piscine et garage. Idéale pour famille.',
                images: [],
                amenities: ['wifi', 'climatisation', 'parking', 'piscine'],
                ownerId: '1',
                ownerName: 'Jean Dupont',
                views: 8,
                createdAt: new Date().toISOString()
            }
        ];
        setStorageData(STORAGE_KEYS.PROPERTIES, sampleProperties);
    }
}

// Initialiser l'application
function initApp() {
    // Initialiser les données d'exemple
    initializeSampleData();
    
    // Charger le thème sauvegardé
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        isDarkMode = true;
        document.body.setAttribute('data-theme', 'dark');
        document.getElementById('themeIcon').textContent = '☀️';
    }

    // Vérifier si l'utilisateur est déjà connecté
    const currentUserData = getStorageData(STORAGE_KEYS.CURRENT_USER);
    if (currentUserData && currentUserData.id) {
        currentUser = currentUserData;
        updateNavForLoggedUser();
        showDashboard();
        loadInitialData();
    } else {
        showScreen('welcome');
    }
}

window.onload = initApp;
