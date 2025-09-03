// Theme Management
let isDarkMode = false;
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    document.getElementById('themeIcon').textContent = isDarkMode ? '☀️' : '🌙';
    // Save theme preference
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// Menu Management
function toggleMenu() {
    const navMenu = document.getElementById('navMenu');
    const hamburger = document.getElementById('hamburger');
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
}

// Screen Navigation
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

// Configuration API
const API_BASE = "https://ton-service.onrender.com";
let authToken = localStorage.getItem("authToken") || null;

// Fonction utilitaire pour les appels API
async function api(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };
    
    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur API: ${response.status}`);
    }
    
    return response.json();
}

// Fonctions d'authentification
async function registerUser(form) {
    const body = {
        full_name: form.fullName.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        password: form.password.value,
        user_type: userType
    };
    
    try {
        const data = await api("/auth/register", {
            method: "POST",
            body: JSON.stringify(body)
        });
        
        authToken = data.token;
        localStorage.setItem("authToken", authToken);
        currentUser = data.user;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function loginUser(form) {
    const body = {
        email: form.loginEmail.value.trim(),
        password: form.loginPassword.value
    };
    
    try {
        const data = await api("/auth/login", {
            method: "POST",
            body: JSON.stringify(body)
        });
        
        authToken = data.token;
        localStorage.setItem("authToken", authToken);
        currentUser = data.user;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Fonctions pour les propriétés
async function fetchProperties(filters = {}) {
    try {
        const qs = new URLSearchParams(filters).toString();
        return await api(`/properties${qs ? `?${qs}` : ""}`);
    } catch (error) {
        console.error("Erreur lors du chargement des propriétés:", error);
        return [];
    }
}

async function viewProperty(id) {
    showLoading();
    try {
        const [detailRes] = await Promise.all([
            api(`/properties/${id}`),
            api(`/properties/${id}/view`, { method: "POST" })
        ]);
        
        const property = detailRes;
        
        // Mettre à jour les données locales
        const index = properties.findIndex(p => p.id === id);
        if (index !== -1) {
            properties[index] = property;
        } else {
            properties.push(property);
        }
        
        modalPropertyOwnerId = property.ownerId;
        modalPropertyId = property.id;

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

        // Load reviews
        loadModalReviews(property.id);
        document.getElementById('propertyModal').classList.add('active');
        
    } catch (error) {
        console.error("Erreur lors du chargement de la propriété:", error);
        alert("Erreur lors du chargement de la propriété: " + error.message);
    } finally {
        hideLoading();
    }
}

async function submitReview(propertyId, stars, comment) {
    try {
        await api(`/properties/${propertyId}/reviews`, {
            method: "POST",
            body: JSON.stringify({ stars, comment })
        });
        
        // Recharger les avis
        loadModalReviews(propertyId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function uploadImage(file) {
    const formData = new FormData();
    formData.append("image", file);
    
    try {
        const response = await fetch(`${API_BASE}/uploads/image`, {
            method: "POST",
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            body: formData
        });
        
        if (!response.ok) {
            throw new Error("Échec de l'upload");
        }
        
        const data = await response.json();
        return data.url;
    } catch (error) {
        console.error("Erreur lors de l'upload d'image:", error);
        throw error;
    }
}

async function saveProperty(form) {
    try {
        // Upload des images
        const imageUrls = [];
        for (const image of currentPropertyImages) {
            if (image.startsWith('data:image')) {
                // Convertir Data URL en blob pour l'upload
                const response = await fetch(image);
                const blob = await response.blob();
                const file = new File([blob], `image-${Date.now()}.jpg`, { type: 'image/jpeg' });
                const url = await uploadImage(file);
                imageUrls.push(url);
            } else {
                // Image déjà uploadée
                imageUrls.push(image);
            }
        }

        const amenities = Array.from(document.querySelectorAll('input[name="amenity"]:checked')).map(cb => cb.value);

        const body = {
            title: form.propertyTitle.value,
            price: parseInt(form.propertyPrice.value),
            type: form.propertyType.value,
            status: form.propertyStatus.value,
            surface: parseInt(form.propertySurface.value) || null,
            rooms: parseInt(form.propertyRooms.value) || null,
            bedrooms: parseInt(form.propertyBedrooms.value) || null,
            bathrooms: parseInt(form.propertyBathrooms.value) || null,
            address: form.propertyAddress.value,
            city: form.propertyCity.value,
            whatsapp: form.propertyWhatsApp.value,
            description: form.propertyDescription.value,
            amenities,
            images: imageUrls
        };

        const id = form.propertyId.value;
        let data;
        
        if (id) {
            // Mise à jour
            data = await api(`/properties/${id}`, {
                method: "PUT",
                body: JSON.stringify(body)
            });
        } else {
            // Création
            data = await api("/properties", {
                method: "POST",
                body: JSON.stringify(body)
            });
        }
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deleteProperty(propertyId) {
    try {
        await api(`/properties/${propertyId}`, {
            method: "DELETE"
        });
        
        // Mettre à jour la liste locale
        properties = properties.filter(p => p.id !== propertyId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Fonctions pour les favoris
async function toggleFavorite(propertyId, isFav) {
    try {
        await api(`/users/me/favorites/${propertyId}`, {
            method: isFav ? "DELETE" : "POST"
        });
        
        // Mettre à jour l'utilisateur local
        if (currentUser) {
            if (isFav) {
                currentUser.favorites = currentUser.favorites.filter(id => id !== propertyId);
            } else {
                currentUser.favorites.push(propertyId);
            }
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Fonctions pour les conversations
async function startConversation(propertyId, otherUserId) {
    try {
        const data = await api(`/conversations/start`, {
            method: "POST",
            body: JSON.stringify({ property_id: propertyId, other_user_id: otherUserId })
        });
        
        // Mettre à jour la liste locale
        conversations.push(data);
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function loadConversationsList() {
    try {
        const data = await api(`/conversations`);
        conversations = data;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function loadChatMessages(conversationId) {
    try {
        const data = await api(`/conversations/${conversationId}/messages`);
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function sendChatMessage(conversationId, content) {
    try {
        const data = await api(`/conversations/message`, {
            method: "POST",
            body: JSON.stringify({ conversation_id: conversationId, content })
        });
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Fonctions pour les visites
async function scheduleVisit(propertyId, date, time, message) {
    try {
        const data = await api(`/visits/schedule`, {
            method: "POST",
            body: JSON.stringify({ property_id: propertyId, date, time, message })
        });
        
        // Mettre à jour la liste locale
        visits.push(data);
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function listVisits() {
    try {
        const data = await api(`/visits`);
        visits = data;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function respondVisit(visitId, status, ownerResponse) {
    try {
        const data = await api(`/visits/respond`, {
            method: "POST",
            body: JSON.stringify({ visit_id: visitId, status, owner_response: ownerResponse })
        });
        
        // Mettre à jour la visite locale
        const index = visits.findIndex(v => v.id === visitId);
        if (index !== -1) {
            visits[index] = data;
        }
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Fonction pour récupérer les données utilisateur
async function fetchUserData(userId) {
    try {
        const data = await api(`/users/${userId}`);
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Fonction pour mettre à jour le profil utilisateur
async function updateUserProfile(profileData) {
    try {
        const data = await api(`/users/me`, {
            method: "PUT",
            body: JSON.stringify(profileData)
        });
        
        currentUser = data;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Fonction pour mettre à jour le mot de passe
async function updateUserPassword(currentPassword, newPassword) {
    try {
        await api(`/users/me/password`, {
            method: "PUT",
            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
        });
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Fonction pour mettre à jour les préférences
async function updateUserPreferences(preferences) {
    try {
        const data = await api(`/users/me/preferences`, {
            method: "PUT",
            body: JSON.stringify(preferences)
        });
        
        currentUser.preferences = data;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Initialisation de l'application
async function initApp() {
    // Charger le thème
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        isDarkMode = true;
        document.body.setAttribute('data-theme', 'dark');
        document.getElementById('themeIcon').textContent = '☀️';
    }

    // Vérifier si l'utilisateur est connecté
    const savedUser = localStorage.getItem('currentUser');
    authToken = localStorage.getItem("authToken");
    
    if (savedUser && authToken) {
        try {
            currentUser = JSON.parse(savedUser);
            
            // Vérifier la validité du token
            const userData = await fetchUserData(currentUser.id);
            if (userData.success) {
                currentUser = userData.data;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateNavForLoggedUser();
                showDashboard();
                
                // Charger les données initiales
                await Promise.all([
                    fetchProperties().then(data => properties = data),
                    loadConversationsList(),
                    listVisits()
                ]);
            } else {
                // Token invalide, déconnecter l'utilisateur
                logout();
            }
        } catch (error) {
            console.error("Erreur lors de l'initialisation:", error);
            logout();
        }
    } else {
        showScreen('welcome');
    }
}

// Modifications des fonctions existantes pour utiliser l'API

function showScreen(screenId, params = {}) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    // Show selected screen
    document.getElementById(screenId).classList.add('active');
    // Close mobile menu
    document.getElementById('navMenu').classList.remove('active');
    document.getElementById('hamburger').classList.remove('active');
    // Load data if needed
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

// User Type Selection
document.addEventListener('DOMContentLoaded', function() {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        isDarkMode = true;
        document.body.setAttribute('data-theme', 'dark');
        document.getElementById('themeIcon').textContent = '☀️';
    }

    const userTypeOptions = document.querySelectorAll('.user-type-option');
    userTypeOptions.forEach(option => {
        option.addEventListener('click', function() {
            userTypeOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            userType = this.getAttribute('data-type');
        });
    });

    // Profile tabs
    const profileTabs = document.querySelectorAll('.profile-tab');
    profileTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            profileTabs.forEach(t => t.classList.remove('active'));
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

    // Messages tabs
    const messagesTabs = document.querySelectorAll('#messagesTabs .profile-tab');
    messagesTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            messagesTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('#messages .profile-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId + 'Tab').classList.add('active');
        });
    });

    // Setup contact form submission
    document.getElementById('contactForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateForm(this)) {
            showLoading();
            setTimeout(() => {
                alert('Votre message a été envoyé! Nous vous répondrons dans les plus brefs délais.');
                this.reset();
                hideLoading();
            }, 1000);
        }
    });

    // Setup profile form submission
    document.getElementById('profileForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateForm(this)) {
            showLoading();
            setTimeout(() => {
                updateProfile();
                hideLoading();
            }, 1000);
        }
    });

    // Setup security form submission
    document.getElementById('securityForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateForm(this)) {
            showLoading();
            setTimeout(() => {
                updatePassword();
                hideLoading();
            }, 1000);
        }
    });

    // Setup preferences form submission
    document.getElementById('preferencesForm').addEventListener('submit', function(e) {
        e.preventDefault();
        showLoading();
        setTimeout(() => {
            updatePreferences();
            hideLoading();
        }, 1000);
    });

    // Setup visit form
    document.getElementById('visitForm').addEventListener('submit', function(e) {
        e.preventDefault();
        submitVisit();
    });

    // Chat input event listener
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });

    // Review stars selection
    document.querySelectorAll('#reviewStars i').forEach(star => {
        star.addEventListener('click', function() {
            currentReviewStars = parseInt(this.dataset.value);
            document.querySelectorAll('#reviewStars i').forEach(s => {
                s.classList.toggle('active', parseInt(s.dataset.value) <= currentReviewStars);
            });
        });
    });

    // Review form submission
    document.getElementById('reviewForm').addEventListener('submit', function(e) {
        e.preventDefault();
        submitReview();
    });
});

// Registration Handler
document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!validateForm(this)) return;
    
    showLoading();
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Additional validation
    if (password !== confirmPassword) {
        document.getElementById('confirmPasswordError').textContent = 'Les mots de passe ne correspondent pas';
        document.getElementById('confirmPasswordError').classList.add('active');
        hideLoading();
        return;
    }

    try {
        const result = await registerUser(this);
        
        if (!result.success) {
            alert(result.error || "Erreur lors de l'inscription");
            hideLoading();
            return;
        }

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
    } catch (error) {
        document.getElementById('emailError').textContent = error.message || 'Erreur lors de l\'inscription';
        document.getElementById('emailError').classList.add('active');
    } finally {
        hideLoading();
    }
});

// Login Handler
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!validateForm(this)) return;
    
    showLoading();
    
    try {
        const result = await loginUser(this);
        
        if (!result.success) {
            document.getElementById('loginPasswordError').textContent = result.error || 'Email ou mot de passe incorrect';
            document.getElementById('loginPasswordError').classList.add('active');
            hideLoading();
            return;
        }

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
    } catch (error) {
        document.getElementById('loginPasswordError').textContent = error.message || 'Email ou mot de passe incorrect';
        document.getElementById('loginPasswordError').classList.add('active');
    } finally {
        hideLoading();
    }
});

// Update Navigation for Logged Users
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

// Logout Handler
function logout() {
    showLoading();
    setTimeout(() => {
        currentUser = null;
        authToken = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        updateNavForLoggedUser();
        showScreen('welcome');
        // Clear forms
        document.getElementById('registerForm').reset();
        document.getElementById('loginForm').reset();
        // Reset user type selection
        document.querySelectorAll('.user-type-option').forEach(opt => {
            opt.classList.remove('active');
        });
        document.querySelector('.user-type-option[data-type="tenant"]').classList.add('active');
        userType = 'tenant';
        hideLoading();
    }, 1000);
}

// Load Profile Data (Own Profile)
async function loadProfileData() {
    if (!currentUser) return;

    try {
        // Récupérer les données à jour de l'utilisateur
        const userData = await fetchUserData(currentUser.id);
        if (userData.success) {
            currentUser = userData.data;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
    } catch (error) {
        console.error("Erreur lors du chargement du profil:", error);
    }

    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileType').textContent = currentUser.type === 'tenant' ? 'Locataire' : 'Propriétaire';
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profilePhone').textContent = currentUser.phone;

    document.getElementById('profileFullName').value = currentUser.name;
    document.getElementById('profilePhoneNumber').value = currentUser.phone;
    document.getElementById('profileEmailAddress').value = currentUser.email;
    document.getElementById('profileBio').value = currentUser.bio || '';

    // Load avatar if exists
    if (currentUser.avatar) {
        document.getElementById('avatarPreview').src = currentUser.avatar;
        document.getElementById('profileAvatar').src = currentUser.avatar;
    }

    // Load preferences
    if (currentUser.preferences) {
        document.getElementById('emailNotifications').checked = currentUser.preferences.emailNotifications;
        document.getElementById('smsNotifications').checked = currentUser.preferences.smsNotifications;
        document.getElementById('whatsappNotifications').checked = currentUser.preferences.whatsappNotifications;
        document.getElementById('language').value = currentUser.preferences.language;
    }

    // Conditionally add tabs based on user type
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

    // Re-attach event listeners to new tabs
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
}

// Load User Profile Data (Public)
async function loadUserProfileData(userId) {
    try {
        const userData = await fetchUserData(userId);
        if (!userData.success) {
            alert("Erreur lors du chargement du profil utilisateur");
            return;
        }
        
        const user = userData.data;
        
        document.getElementById('userProfileName').textContent = user.name;
        document.getElementById('userProfileType').textContent = user.type === 'tenant' ? 'Locataire' : 'Propriétaire';
        document.getElementById('userProfileEmail').textContent = user.email;
        document.getElementById('userProfilePhone').textContent = user.phone;
        document.getElementById('userProfileBio').textContent = user.bio || 'Aucune bio disponible.';

        // Load avatar
        document.getElementById('userProfileAvatar').src = user.avatar || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' fill='%233b82f6'/><text x='60' y='70' font-family='Arial' font-size='40' fill='white' text-anchor='middle'>${user.name.charAt(0).toUpperCase()}</text></svg>`;

        // Load publications if owner
        const publicationsContainer = document.getElementById('userProfilePublications');
        publicationsContainer.innerHTML = '';
        if (user.type === 'owner') {
            try {
                const userProperties = await fetchProperties({ owner_id: userId });
                userProperties.forEach(property => {
                    const propertyCard = createPropertyCard(property, false);
                    publicationsContainer.appendChild(propertyCard);
                });
            } catch (error) {
                console.error("Erreur lors du chargement des propriétés:", error);
                publicationsContainer.innerHTML = '<p class="text-center">Erreur lors du chargement des publications.</p>';
            }
        } else {
            publicationsContainer.innerHTML = '<p class="text-center">Cet utilisateur n\'a pas de publications.</p>';
        }
    } catch (error) {
        console.error("Erreur lors du chargement du profil utilisateur:", error);
        alert("Erreur lors du chargement du profil utilisateur");
    }
}

// Load Profile Publications (Own)
async function loadProfilePublications() {
    if (!currentUser || currentUser.type !== 'owner') return;

    const publicationsContainer = document.getElementById('profilePublications');
    publicationsContainer.innerHTML = '';

    try {
        const userProperties = await fetchProperties({ owner_id: currentUser.id });
        
        if (userProperties.length === 0) {
            publicationsContainer.innerHTML = '<p class="text-center">Vous n\'avez pas encore de propriétés.</p>';
            return;
        }

        userProperties.forEach(property => {
            const propertyCard = createPropertyCard(property, true);
            publicationsContainer.appendChild(propertyCard);
        });
    } catch (error) {
        console.error("Erreur lors du chargement des publications:", error);
        publicationsContainer.innerHTML = '<p class="text-center">Erreur lors du chargement des publications.</p>';
    }
}

// Load Profile Favorites (Tenant)
async function loadProfileFavorites() {
    if (!currentUser || currentUser.type !== 'tenant') return;

    const favoritesContainer = document.getElementById('profileFavorites');
    favoritesContainer.innerHTML = '';

    try {
        // Récupérer les favoris de l'utilisateur
        const favoriteIds = currentUser.favorites || [];
        
        if (favoriteIds.length === 0) {
            favoritesContainer.innerHTML = '<p class="text-center">Aucun favori pour le moment.</p>';
            return;
        }

        // Récupérer les propriétés favorites
        const favoriteProperties = [];
        for (const id of favoriteIds) {
            try {
                const property = await fetchProperties({ id: id });
                if (property && property.length > 0) {
                    favoriteProperties.push(property[0]);
                }
            } catch (error) {
                console.error(`Erreur lors du chargement de la propriété ${id}:`, error);
            }
        }

        if (favoriteProperties.length === 0) {
            favoritesContainer.innerHTML = '<p class="text-center">Aucun favori pour le moment.</p>';
            return;
        }

        favoriteProperties.forEach(property => {
            const propertyCard = createPropertyCard(property, false);
            favoritesContainer.appendChild(propertyCard);
        });
    } catch (error) {
        console.error("Erreur lors du chargement des favoris:", error);
        favoritesContainer.innerHTML = '<p class="text-center">Erreur lors du chargement des favoris.</p>';
    }
}

// Load Profile Visits (Tenant)
async function loadProfileVisits() {
    if (!currentUser || currentUser.type !== 'tenant') return;

    const visitsContainer = document.getElementById('profileVisits');
    visitsContainer.innerHTML = '';

    try {
        await listVisits();
        const userVisits = visits.filter(v => v.userId === currentUser.id);
        
        if (userVisits.length === 0) {
            visitsContainer.innerHTML = '<p class="text-center">Aucune visite programmée.</p>';
            return;
        }

        userVisits.forEach(visit => {
            const property = properties.find(p => p.id === visit.propertyId);
            if (!property) return;

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
        });
    } catch (error) {
        console.error("Erreur lors du chargement des visites:", error);
        visitsContainer.innerHTML = '<p class="text-center">Erreur lors du chargement des visites.</p>';
    }
}

// Update Profile
async function updateProfile() {
    if (!currentUser) return;

    const fullName = document.getElementById('profileFullName').value.trim();
    const phone = document.getElementById('profilePhoneNumber').value.trim();
    const email = document.getElementById('profileEmailAddress').value.trim();
    const bio = document.getElementById('profileBio').value.trim();

    const profileData = {
        full_name: fullName,
        phone,
        email,
        bio
    };

    try {
        const result = await updateUserProfile(profileData);
        
        if (!result.success) {
            alert(result.error || "Erreur lors de la mise à jour du profil");
            return;
        }

        alert('Profil mis à jour avec succès!');
        loadProfileData();
    } catch (error) {
        alert("Erreur lors de la mise à jour du profil: " + error.message);
    }
}

// Update Password
async function updatePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmPassword) {
        document.getElementById('confirmNewPasswordError').textContent = 'Les mots de passe ne correspondent pas';
        document.getElementById('confirmNewPasswordError').classList.add('active');
        return;
    }

    try {
        const result = await updateUserPassword(currentPassword, newPassword);
        
        if (!result.success) {
            alert(result.error || "Erreur lors de la mise à jour du mot de passe");
            return;
        }

        alert('Mot de passe mis à jour avec succès!');
        document.getElementById('securityForm').reset();
    } catch (error) {
        alert("Erreur lors de la mise à jour du mot de passe: " + error.message);
    }
}

// Update Preferences
async function updatePreferences() {
    if (!currentUser) return;

    const preferences = {
        emailNotifications: document.getElementById('emailNotifications').checked,
        smsNotifications: document.getElementById('smsNotifications').checked,
        whatsappNotifications: document.getElementById('whatsappNotifications').checked,
        language: document.getElementById('language').value
    };

    try {
        const result = await updateUserPreferences(preferences);
        
        if (!result.success) {
            alert(result.error || "Erreur lors de la mise à jour des préférences");
            return;
        }

        alert('Préférences mises à jour avec succès!');
    } catch (error) {
        alert("Erreur lors de la mise à jour des préférences: " + error.message);
    }
}

// Avatar Upload
function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image valide.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        currentAvatar = event.target.result;
        document.getElementById('avatarPreview').src = currentAvatar;
        document.getElementById('profileAvatar').src = currentAvatar;
    };
    reader.readAsDataURL(file);
}

// Load Tenant Properties
async function loadTenantProperties() {
    const propertiesContainer = document.getElementById('tenantProperties');
    propertiesContainer.innerHTML = '';

    try {
        const data = await fetchProperties();
        properties = data;
        
        if (properties.length === 0) {
            propertiesContainer.innerHTML = '<p class="text-center">Aucune propriété disponible pour le moment.</p>';
            return;
        }

        properties.forEach(property => {
            const propertyCard = createPropertyCard(property, false);
            propertiesContainer.appendChild(propertyCard);
        });
    } catch (error) {
        console.error("Erreur lors du chargement des propriétés:", error);
        propertiesContainer.innerHTML = '<p class="text-center">Erreur lors du chargement des propriétés.</p>';
    }
}

// Load Owner Properties
async function loadOwnerProperties() {
    const propertiesContainer = document.getElementById('ownerProperties');
    propertiesContainer.innerHTML = '';

    try {
        const data = await fetchProperties({ owner_id: currentUser.id });
        properties = data;
        
        if (properties.length === 0) {
            propertiesContainer.innerHTML = '<p class="text-center">Vous n\'avez pas encore de propriétés.</p>';
            return;
        }

        properties.forEach(property => {
            const propertyCard = createPropertyCard(property, true);
            propertiesContainer.appendChild(propertyCard);
        });
    } catch (error) {
        console.error("Erreur lors du chargement des propriétés:", error);
        propertiesContainer.innerHTML = '<p class="text-center">Erreur lors du chargement des propriétés.</p>';
    }
}

// Create Property Card
function createPropertyCard(property, isOwner = false) {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.innerHTML = `
        <div class="property-image">
            <img src="${property.images && property.images.length > 0 ? property.images[0] : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23f3f4f6"/><text x="150" y="100" font-family="Arial" font-size="20" fill="%236b7280" text-anchor="middle">Image non disponible</text></svg>'}" alt="${property.title}">
            <div class="property-price">${property.price.toLocaleString('fr-DZ')} DZD/mois</div>
            ${isOwner ? `<div class="property-status status-${property.status}">${property.status === 'available' ? 'Disponible' : 'Loué'}</div>` : ''}
            ${!isOwner && currentUser ? `<div class="property-favorite ${currentUser.favorites && currentUser.favorites.includes(property.id) ? 'active' : ''}" onclick="toggleFavoriteHandler(event, '${property.id}')">
                <i class="fas fa-heart"></i>
            </div>` : ''}
        </div>
        <div class="property-info">
            <h3>${property.title}</h3>
            <p class="property-address">📍 ${property.address}, ${property.city}</p>
            <div class="property-details">
                <span>📐 ${property.surface}m²</span>
                <span>🏠 ${property.rooms} pièces</span>
                <span>🛏️ ${property.bedrooms} ch</span>
                <span>🚿 ${property.bathrooms} sdb</span>
            </div>
            <div class="property-actions">
                <button class="btn btn-primary" onclick="viewProperty('${property.id}')">Voir détails</button>
                ${isOwner ? `
                    <button class="btn btn-secondary" onclick="editProperty('${property.id}')">Modifier</button>
                    <button class="btn btn-danger" onclick="deletePropertyHandler('${property.id}')">Supprimer</button>
                ` : `
                    ${currentUser ? `<button class="btn btn-secondary" onclick="showVisitForm('${property.id}')">Planifier visite</button>` : ''}
                `}
            </div>
        </div>
    `;
    return card;
}

// Toggle Favorite Handler
async function toggleFavoriteHandler(event, propertyId) {
    event.stopPropagation();
    if (!currentUser) {
        alert('Veuillez vous connecter pour ajouter aux favoris.');
        return;
    }

    const isFav = currentUser.favorites && currentUser.favorites.includes(propertyId);
    
    try {
        const result = await toggleFavorite(propertyId, isFav);
        
        if (!result.success) {
            alert(result.error || "Erreur lors de la mise à jour des favoris");
            return;
        }

        // Mettre à jour l'affichage
        const favoriteElement = event.currentTarget;
        if (isFav) {
            favoriteElement.classList.remove('active');
        } else {
            favoriteElement.classList.add('active');
        }
    } catch (error) {
        alert("Erreur lors de la mise à jour des favoris: " + error.message);
    }
}

// Delete Property Handler
async function deletePropertyHandler(propertyId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette propriété ?')) return;

    try {
        const result = await deleteProperty(propertyId);
        
        if (!result.success) {
            alert(result.error || "Erreur lors de la suppression de la propriété");
            return;
        }

        alert('Propriété supprimée avec succès!');
        loadOwnerProperties();
    } catch (error) {
        alert("Erreur lors de la suppression de la propriété: " + error.message);
    }
}

// Edit Property
function editProperty(propertyId) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    // Populate form
    document.getElementById('propertyId').value = property.id;
    document.getElementById('propertyTitle').value = property.title;
    document.getElementById('propertyPrice').value = property.price;
    document.getElementById('propertyType').value = property.type;
    document.getElementById('propertyStatus').value = property.status;
    document.getElementById('propertySurface').value = property.surface || '';
    document.getElementById('propertyRooms').value = property.rooms || '';
    document.getElementById('propertyBedrooms').value = property.bedrooms || '';
    document.getElementById('propertyBathrooms').value = property.bathrooms || '';
    document.getElementById('propertyAddress').value = property.address;
    document.getElementById('propertyCity').value = property.city;
    document.getElementById('propertyWhatsApp').value = property.whatsapp;
    document.getElementById('propertyDescription').value = property.description;

    // Set amenities
    document.querySelectorAll('input[name="amenity"]').forEach(checkbox => {
        checkbox.checked = property.amenities && property.amenities.includes(checkbox.value);
    });

    // Set images
    currentPropertyImages = property.images || [];
    updateImagePreviews();

    // Show form
    showScreen('propertyForm');
}

// Update Image Previews
function updateImagePreviews() {
    const previewContainer = document.getElementById('imagePreviews');
    previewContainer.innerHTML = '';

    currentPropertyImages.forEach((image, index) => {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.innerHTML = `
            <img src="${image}" alt="Preview ${index + 1}">
            <button type="button" onclick="removeImage(${index})">×</button>
        `;
        previewContainer.appendChild(preview);
    });
}

// Remove Image
function removeImage(index) {
    currentPropertyImages.splice(index, 1);
    updateImagePreviews();
}

// Handle Image Upload
function handleImageUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const reader = new FileReader();
        reader.onload = function(event) {
            currentPropertyImages.push(event.target.result);
            updateImagePreviews();
        };
        reader.readAsDataURL(file);
    }

    // Reset input
    e.target.value = '';
}

// Submit Property Form
document.getElementById('propertyForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!validateForm(this)) return;

    showLoading();
    
    try {
        const result = await saveProperty(this);
        
        if (!result.success) {
            alert(result.error || "Erreur lors de la sauvegarde de la propriété");
            hideLoading();
            return;
        }

        alert(document.getElementById('propertyId').value ? 'Propriété modifiée avec succès!' : 'Propriété ajoutée avec succès!');
        this.reset();
        currentPropertyImages = [];
        updateImagePreviews();
        showDashboard();
    } catch (error) {
        alert("Erreur lors de la sauvegarde de la propriété: " + error.message);
    } finally {
        hideLoading();
    }
});

// Load Modal Reviews
async function loadModalReviews(propertyId) {
    try {
        const property = await api(`/properties/${propertyId}`);
        const reviewsContainer = document.getElementById('modalReviews');
        reviewsContainer.innerHTML = '';

        if (!property.reviews || property.reviews.length === 0) {
            reviewsContainer.innerHTML = '<p class="text-center">Aucun avis pour le moment.</p>';
            return;
        }

        property.reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.className = 'review';
            reviewElement.innerHTML = `
                <div class="review-header">
                    <div class="review-user">${review.userName}</div>
                    <div class="review-stars">${getStarsHTML(review.stars)}</div>
                </div>
                <div class="review-date">${new Date(review.date).toLocaleDateString('fr-FR')}</div>
                <div class="review-comment">${review.comment}</div>
            `;
            reviewsContainer.appendChild(reviewElement);
        });
    } catch (error) {
        console.error("Erreur lors du chargement des avis:", error);
        document.getElementById('modalReviews').innerHTML = '<p class="text-center">Erreur lors du chargement des avis.</p>';
    }
}

// Submit Review
async function submitReview() {
    if (!currentUser) {
        alert('Veuillez vous connecter pour laisser un avis.');
        return;
    }

    const comment = document.getElementById('reviewComment').value.trim();
    if (!comment) {
        alert('Veuillez saisir un commentaire.');
        return;
    }

    if (currentReviewStars === 0) {
        alert('Veuillez sélectionner une note.');
        return;
    }

    try {
        const result = await submitReview(modalPropertyId, currentReviewStars, comment);
        
        if (!result.success) {
            alert(result.error || "Erreur lors de l'envoi de l'avis");
            return;
        }

        alert('Avis envoyé avec succès!');
        document.getElementById('reviewComment').value = '';
        currentReviewStars = 0;
        document.querySelectorAll('#reviewStars i').forEach(star => {
            star.classList.remove('active');
        });
        loadModalReviews(modalPropertyId);
    } catch (error) {
        alert("Erreur lors de l'envoi de l'avis: " + error.message);
    }
}

// Show Visit Form
function showVisitForm(propertyId) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    currentWhatsAppProperty = property;
    document.getElementById('visitPropertyTitle').textContent = property.title;
    document.getElementById('visitPropertyAddress').textContent = `${property.address}, ${property.city}`;
    document.getElementById('visitPropertyPrice').textContent = `${property.price.toLocaleString('fr-DZ')} DZD/mois`;
    document.getElementById('visitDate').value = '';
    document.getElementById('visitTime').value = '';
    document.getElementById('visitMessage').value = '';
    document.getElementById('visitModal').classList.add('active');
}

// Submit Visit
async function submitVisit() {
    if (!currentUser) {
        alert('Veuillez vous connecter pour planifier une visite.');
        return;
    }

    const date = document.getElementById('visitDate').value;
    const time = document.getElementById('visitTime').value;
    const message = document.getElementById('visitMessage').value.trim();

    if (!date || !time) {
        alert('Veuillez sélectionner une date et une heure.');
        return;
    }

    try {
        const result = await scheduleVisit(currentWhatsAppProperty.id, date, time, message);
        
        if (!result.success) {
            alert(result.error || "Erreur lors de la planification de la visite");
            return;
        }

        alert('Visite planifiée avec succès! Le propriétaire sera informé.');
        document.getElementById('visitModal').classList.remove('active');
    } catch (error) {
        alert("Erreur lors de la planification de la visite: " + error.message);
    }
}

// Load Conversations
async function loadConversations() {
    const conversationsContainer = document.getElementById('conversationsList');
    conversationsContainer.innerHTML = '';

    try {
        const result = await loadConversationsList();
        if (!result.success) {
            conversationsContainer.innerHTML = '<p class="text-center">Erreur lors du chargement des conversations.</p>';
            return;
        }

        if (conversations.length === 0) {
            conversationsContainer.innerHTML = '<p class="text-center">Aucune conversation.</p>';
            return;
        }

        conversations.forEach(conversation => {
            const otherUser = conversation.participants.find(p => p.id !== currentUser.id);
            const lastMessage = conversation.lastMessage;
            
            const conversationElement = document.createElement('div');
            conversationElement.className = 'conversation';
            conversationElement.innerHTML = `
                <div class="conversation-avatar">
                    <img src="${otherUser.avatar || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><rect width='40' height='40' fill='%233b82f6'/><text x='20' y='25' font-family='Arial' font-size='20' fill='white' text-anchor='middle'>${otherUser.name.charAt(0).toUpperCase()}</text></svg>`}" alt="${otherUser.name}">
                </div>
                <div class="conversation-info">
                    <div class="conversation-name">${otherUser.name}</div>
                    <div class="conversation-last-message">${lastMessage ? lastMessage.content : 'Aucun message'}</div>
                </div>
                <div class="conversation-meta">
                    <div class="conversation-time">${lastMessage ? formatTime(lastMessage.timestamp) : ''}</div>
                    ${conversation.unreadCount > 0 ? `<div class="conversation-unread">${conversation.unreadCount}</div>` : ''}
                </div>
            `;
            conversationElement.addEventListener('click', () => openChat(conversation.id, otherUser.id, conversation.propertyId));
            conversationsContainer.appendChild(conversationElement);
        });
    } catch (error) {
        console.error("Erreur lors du chargement des conversations:", error);
        conversationsContainer.innerHTML = '<p class="text-center">Erreur lors du chargement des conversations.</p>';
    }
}

// Load Visit Requests
async function loadVisitRequests() {
    const visitsContainer = document.getElementById('visitsList');
    visitsContainer.innerHTML = '';

    try {
        await listVisits();
        const userVisits = currentUser.type === 'owner' 
            ? visits.filter(v => v.ownerId === currentUser.id)
            : visits.filter(v => v.userId === currentUser.id);
        
        if (userVisits.length === 0) {
            visitsContainer.innerHTML = '<p class="text-center">Aucune demande de visite.</p>';
            return;
        }

        userVisits.forEach(visit => {
            const property = properties.find(p => p.id === visit.propertyId);
            if (!property) return;

            const user = currentUser.type === 'owner' 
                ? users.find(u => u.id === visit.userId)
                : users.find(u => u.id === visit.ownerId);
            
            const visitElement = document.createElement('div');
            visitElement.className = 'visit-request';
            visitElement.innerHTML = `
                <div class="visit-request-header">
                    <h4>${property.title}</h4>
                    <span class="visit-status status-${visit.status || 'pending'}">${getStatusText(visit.status)}</span>
                </div>
                <p><strong>${currentUser.type === 'owner' ? 'Locataire' : 'Propriétaire'}:</strong> ${user ? user.name : 'Inconnu'}</p>
                <p><strong>Date:</strong> ${new Date(visit.date).toLocaleDateString('fr-FR')} à ${visit.time}</p>
                <p><strong>Adresse:</strong> ${property.address}, ${property.city}</p>
                ${visit.message ? `<p><strong>Message:</strong> ${visit.message}</p>` : ''}
                ${currentUser.type === 'owner' && visit.status === 'pending' ? `
                    <div class="visit-actions">
                        <button class="btn btn-primary" onclick="respondToVisit('${visit.id}', 'accepted')">Accepter</button>
                        <button class="btn btn-danger" onclick="respondToVisit('${visit.id}', 'rejected')">Refuser</button>
                    </div>
                ` : ''}
                ${visit.ownerResponse ? `<p><strong>Réponse du propriétaire:</strong> ${visit.ownerResponse}</p>` : ''}
            `;
            visitsContainer.appendChild(visitElement);
        });
    } catch (error) {
        console.error("Erreur lors du chargement des demandes de visite:", error);
        visitsContainer.innerHTML = '<p class="text-center">Erreur lors du chargement des demandes de visite.</p>';
    }
}

// Respond to Visit
async function respondToVisit(visitId, status) {
    const ownerResponse = prompt('Veuillez saisir votre réponse (optionnel):');
    if (ownerResponse === null) return; // User cancelled

    try {
        const result = await respondVisit(visitId, status, ownerResponse || '');
        
        if (!result.success) {
            alert(result.error || "Erreur lors de la réponse à la visite");
            return;
        }

        alert('Réponse envoyée avec succès!');
        loadVisitRequests();
    } catch (error) {
        alert("Erreur lors de la réponse à la visite: " + error.message);
    }
}

// Open Chat
async function openChat(conversationId, otherUserId, propertyId) {
    currentChat = { conversationId, otherUserId, propertyId };
    document.getElementById('chatHeader').innerHTML = `
        <div class="chat-user-info">
            <img src="${users.find(u => u.id === otherUserId)?.avatar || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><rect width='40' height='40' fill='%233b82f6'/><text x='20' y='25' font-family='Arial' font-size='20' fill='white' text-anchor='middle'>${users.find(u => u.id === otherUserId)?.name.charAt(0).toUpperCase() || '?'}</text></svg>`}" alt="Avatar">
            <div>
                <div class="chat-user-name">${users.find(u => u.id === otherUserId)?.name || 'Utilisateur inconnu'}</div>
                <div class="chat-user-status">En ligne</div>
            </div>
        </div>
    `;
    document.getElementById('chatContainer').classList.add('active');
    loadChatMessages(conversationId);
}

// Load Chat Messages
async function loadChatMessages(conversationId) {
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = '';

    try {
        const result = await loadChatMessages(conversationId);
        if (!result.success) {
            messagesContainer.innerHTML = '<p class="text-center">Erreur lors du chargement des messages.</p>';
            return;
        }

        const messages = result.data;
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = '<p class="text-center">Aucun message.</p>';
            return;
        }

        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.senderId === currentUser.id ? 'sent' : 'received'}`;
            messageElement.innerHTML = `
                <div class="message-content">${message.content}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            `;
            messagesContainer.appendChild(messageElement);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error("Erreur lors du chargement des messages:", error);
        messagesContainer.innerHTML = '<p class="text-center">Erreur lors du chargement des messages.</p>';
    }
}

// Send Chat Message
async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const content = input.value.trim();
    if (!content) return;

    try {
        const result = await sendChatMessage(currentChat.conversationId, content);
        
        if (!result.success) {
            alert(result.error || "Erreur lors de l'envoi du message");
            return;
        }

        // Add message to UI
        const messagesContainer = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = 'message sent';
        messageElement.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-time">${formatTime(new Date())}</div>
        `;
        messagesContainer.appendChild(messageElement);
        
        // Clear input and scroll to bottom
        input.value = '';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        alert("Erreur lors de l'envoi du message: " + error.message);
    }
}

// Close Chat
function closeChat() {
    document.getElementById('chatContainer').classList.remove('active');
    currentChat = { conversationId: null, otherUserId: null, propertyId: null };
}

// Search Properties
document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    loadSearchResults();
});

async function loadSearchResults() {
    const searchContainer = document.getElementById('searchResults');
    searchContainer.innerHTML = '';

    const type = document.getElementById('searchType').value;
    const city = document.getElementById('searchCity').value;
    const minPrice = document.getElementById('searchMinPrice').value;
    const maxPrice = document.getElementById('searchMaxPrice').value;
    const minRooms = document.getElementById('searchMinRooms').value;
    const minBedrooms = document.getElementById('searchMinBedrooms').value;
    const minBathrooms = document.getElementById('searchMinBathrooms').value;
    const minSurface = document.getElementById('searchMinSurface').value;

    const filters = {};
    if (type) filters.type = type;
    if (city) filters.city = city;
    if (minPrice) filters.min_price = minPrice;
    if (maxPrice) filters.max_price = maxPrice;
    if (minRooms) filters.min_rooms = minRooms;
    if (minBedrooms) filters.min_bedrooms = minBedrooms;
    if (minBathrooms) filters.min_bathrooms = minBathrooms;
    if (minSurface) filters.min_surface = minSurface;

    try {
        const data = await fetchProperties(filters);
        properties = data;
        
        if (properties.length === 0) {
            searchContainer.innerHTML = '<p class="text-center">Aucun résultat trouvé.</p>';
            return;
        }

        properties.forEach(property => {
            const propertyCard = createPropertyCard(property, false);
            searchContainer.appendChild(propertyCard);
        });
    } catch (error) {
        console.error("Erreur lors de la recherche:", error);
        searchContainer.innerHTML = '<p class="text-center">Erreur lors de la recherche.</p>';
    }
}

// Utility Functions
function showLoading() {
    document.getElementById('loading').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('active');
}

function validateForm(form) {
    let isValid = true;
    form.querySelectorAll('[required]').forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            const errorElement = document.getElementById(input.id + 'Error');
            if (errorElement) {
                errorElement.textContent = 'Ce champ est requis';
                errorElement.classList.add('active');
            }
        }
    });
    return isValid;
}

function getStarsHTML(stars) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += i <= stars ? '★' : '☆';
    }
    return html;
}

function getStatusText(status) {
    switch (status) {
        case 'pending': return 'En attente';
        case 'accepted': return 'Acceptée';
        case 'rejected': return 'Refusée';
        case 'completed': return 'Terminée';
        default: return 'Inconnu';
    }
}

function formatTime(date) {
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function showDashboard() {
    if (currentUser.type === 'tenant') {
        showScreen('tenantDashboard');
    } else {
        showScreen('ownerDashboard');
    }
}

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Prevent modal content clicks from closing modal
document.querySelectorAll('.modal-content').forEach(content => {
    content.addEventListener('click', function(e) {
        e.stopPropagation();
    });
});

// Initialize the app
initApp();