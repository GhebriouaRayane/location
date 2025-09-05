// Configuration de l'API - Remplacez par votre URL Render
const API_BASE_URL = 'https://dz-loc.onrender.com';

// Gestion du thème
let isDarkMode = false;
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    document.getElementById('themeIcon').textContent = isDarkMode ? '☀️' : '🌙';
    // Sauvegarder la préférence de thème
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

// Fonctions d'API
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Erreur API:', error);
        throw error;
    }
}

// Charger les données depuis l'API
async function loadInitialData() {
    try {
        showLoading();
        
        // Charger les propriétés
        const propertiesData = await apiCall('/api/properties');
        properties = propertiesData;
        
        // Charger les conversations si l'utilisateur est connecté
        if (currentUser) {
            const conversationsData = await apiCall('/api/conversations');
            conversations = conversationsData;
            
            const visitsData = await apiCall('/api/visits');
            visits = visitsData;
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

// Gestion de la sélection du type d'utilisateur
document.addEventListener('DOMContentLoaded', function() {
    // Charger le thème sauvegardé
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        isDarkMode = true;
        document.body.setAttribute('data-theme', 'dark');
        document.getElementById('themeIcon').textContent = '☀️';
    }

    // Vérifier si l'utilisateur est déjà connecté
    const token = localStorage.getItem('token');
    if (token) {
        // Récupérer les informations de l'utilisateur
        try {
            showLoading();
            apiCall('/api/auth/me')
                .then(userData => {
                    currentUser = userData;
                    updateNavForLoggedUser();
                    showDashboard();
                    loadInitialData();
                    hideLoading();
                })
                .catch(error => {
                    console.error('Erreur de vérification de connexion:', error);
                    localStorage.removeItem('token');
                    hideLoading();
                });
        } catch (error) {
            console.error('Erreur:', error);
            hideLoading();
        }
    } else {
        showScreen('welcome');
    }

    const userTypeOptions = document.querySelectorAll('.user-type-option');
    userTypeOptions.forEach(option => {
        option.addEventListener('click', function() {
            userTypeOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            userType = this.getAttribute('data-type');
        });
    });

    // Onglets du profil
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

    // Onglets des messages
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

    // Configuration de la soumission du formulaire de contact
    document.getElementById('contactForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateForm(this)) {
            showLoading();
            // Envoyer les données au backend
            const formData = {
                name: document.getElementById('contactName').value,
                email: document.getElementById('contactEmail').value,
                subject: document.getElementById('contactSubject').value,
                message: document.getElementById('contactMessage').value
            };
            
            apiCall('/api/contact', {
                method: 'POST',
                body: JSON.stringify(formData)
            })
            .then(() => {
                alert('Votre message a été envoyé! Nous vous répondrons dans les plus brefs délais.');
                this.reset();
                hideLoading();
            })
            .catch(error => {
                console.error('Erreur:', error);
                alert('Une erreur s\'est produite lors de l\'envoi du message.');
                hideLoading();
            });
        }
    });

    // Configuration de la soumission du formulaire de profil
    document.getElementById('profileForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateForm(this)) {
            showLoading();
            updateProfile();
        }
    });

    // Configuration de la soumission du formulaire de sécurité
    document.getElementById('securityForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateForm(this)) {
            showLoading();
            updatePassword();
        }
    });

    // Configuration de la soumission du formulaire de préférences
    document.getElementById('preferencesForm').addEventListener('submit', function(e) {
        e.preventDefault();
        showLoading();
        updatePreferences();
    });

    // Configuration du formulaire de visite
    document.getElementById('visitForm').addEventListener('submit', function(e) {
        e.preventDefault();
        submitVisit();
    });

    // Écouteur d'événement pour la saisie du chat
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });

    // Sélection des étoiles pour l'avis
    document.querySelectorAll('#reviewStars i').forEach(star => {
        star.addEventListener('click', function() {
            currentReviewStars = parseInt(this.dataset.value);
            document.querySelectorAll('#reviewStars i').forEach(s => {
                s.classList.toggle('active', parseInt(s.dataset.value) <= currentReviewStars);
            });
        });
    });

    // Soumission du formulaire d'avis
    document.getElementById('reviewForm').addEventListener('submit', function(e) {
        e.preventDefault();
        submitReview();
    });
});

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

    // Créer l'utilisateur via l'API
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
            // Stocker le token JWT pour les futures requêtes
            localStorage.setItem('token', data.token);
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
        } else {
            document.getElementById('emailError').textContent = data.msg || 'Erreur lors de l\'inscription';
            document.getElementById('emailError').classList.add('active');
        }
        hideLoading();
    })
    .catch(error => {
        console.error('Erreur:', error);
        document.getElementById('emailError').textContent = 'Erreur lors de l\'inscription';
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

    // Appel API vers le backend
    apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    })
    .then(data => {
        if (data.token) {
            // Stocker le token JWT pour les futures requêtes
            localStorage.setItem('token', data.token);
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
        } else {
            document.getElementById('loginPasswordError').textContent = data.msg || 'Email ou mot de passe incorrect';
            document.getElementById('loginPasswordError').classList.add('active');
        }
        hideLoading();
    })
    .catch(error => {
        console.error('Erreur:', error);
        document.getElementById('loginPasswordError').textContent = 'Erreur serveur';
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
    apiCall('/api/auth/logout', {
        method: 'POST'
    })
    .finally(() => {
        currentUser = null;
        localStorage.removeItem('token');
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

// Charger les données du profil (propre profil)
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

// Charger les publications du profil (propre)
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

// Charger les favoris du profil (locataire)
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

// Charger les visites du profil (locataire)
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
        document.getElementById('currentPasswordError').textContent = 'Erreur lors de la mise à jour du mot de passe';
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

        // Construire les paramètres de requête
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

    const isFavorited = currentUser && currentUser.type === 'tenant' && currentUser.favorites && currentUser.favorites.includes(property.id);

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
                imagePlaceholder}
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
                    <button class="btn btn-primary" onclick="viewProperty(${property.id})">Voir</button>
                    <button class="btn btn-secondary" onclick="editProperty(${property.id})">Modifier</button>
                    <button class="btn" onclick="deleteProperty(${property.id})" style="background: var(--error-color); color: white;">Supprimer</button>
                ` : `
                    <button class="btn btn-primary" onclick="viewProperty(${property.id})">Voir détails</button>
                    <button class="btn btn-whatsapp" onclick="contactOwner(${property.id})">
                        <i class="fab fa-whatsapp"></i> Contacter
                    </button>
                    <button class="btn btn-secondary" onclick="startConversation(${property.id})">Message</button>
                    ${currentUser && currentUser.type === 'tenant' ? `<button class="btn btn-favorite ${isFavorited ? 'active' : ''}" onclick="toggleFavorite(${property.id})">${isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button>` : ''}
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
    const property = properties.find(p => p.id === propertyId);
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
            const reviewer = await apiCall(`/api/users/${review.userId}`);
            const reviewerName = reviewer ? reviewer.name : 'Anonyme';

            const reviewCard = document.createElement('div');
            reviewCard.className = 'review-card';
            reviewCard.innerHTML = `
                <div class="review-stars">${'<i class="fas fa-star"></i>'.repeat(review.stars)}</div>
                <div class="review-comment">${review.comment}</div>
                <p class="text-right" style="font-size: 0.8rem; color: var(--text-secondary);">${reviewerName} - ${new Date(review.date).toLocaleDateString('fr-FR')}</p>
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

// Initialiser l'application
function initApp() {
    // Vérifier si l'utilisateur est déjà connecté
    const token = localStorage.getItem('token');
    if (token) {
        // Récupérer les informations de l'utilisateur
        showLoading();
        apiCall('/api/auth/me')
            .then(userData => {
                currentUser = userData;
                updateNavForLoggedUser();
                showDashboard();
                loadInitialData();
                hideLoading();
            })
            .catch(error => {
                console.error('Erreur de vérification de connexion:', error);
                localStorage.removeItem('token');
                showScreen('welcome');
                hideLoading();
            });
    } else {
        showScreen('welcome');
    }
}

window.onload = initApp;
