// Global variables
let map;
let geocoder;
let markers = [];
let markerLayer; // Layer group for markers
let currentDayId = null;
let selectedDayId = null; // Track which day is currently selected for map display
let editingItemId = null; // Track which item is being edited
let editingMode = false; // Track if we're in edit mode
let travelPlan = {
    title: 'My Travel Plan',
    startDate: '',
    endDate: '',
    days: []
};

// Google Maps API configuration
// API key is loaded from config.js file
let GOOGLE_MAPS_API_KEY = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for config.js to load if it exists, then initialize
    setTimeout(function() {
        // Initialize API key from config when available
        if (window.CONFIG && window.CONFIG.GOOGLE_MAPS_API_KEY) {
            GOOGLE_MAPS_API_KEY = window.CONFIG.GOOGLE_MAPS_API_KEY;
            console.log('Google Maps API key loaded from config');
            
            // Check if the key is still the placeholder
            if (GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
                console.warn('Please replace the placeholder API key in config.js with your actual Google Maps API key');
                GOOGLE_MAPS_API_KEY = null;
            }
        } else {
            console.warn('Google Maps API key not found in config. Falling back to OpenStreetMap geocoding only.');
        }
        
        initializeApp();
        initMap(); // Initialize map directly
        loadTravelPlan();
    }, 100); // Small delay to allow config.js to load
});

// Initialize Leaflet Map with OpenStreetMap
function initMap() {
    // Default location (New York City)
    const defaultLocation = [40.7128, -74.0060];
    
    // Initialize map with OpenStreetMap tiles
    map = L.map('map', {
        center: defaultLocation,
        zoom: 13,
        zoomControl: true,
        attributionControl: true
    });

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // Initialize marker layer group
    markerLayer = L.layerGroup().addTo(map);

    // Initialize geocoder (using Nominatim)
    geocoder = L.Control.Geocoder.nominatim();

    // Try to get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const userLocation = [position.coords.latitude, position.coords.longitude];
            map.setView(userLocation, 15);
        });
    }
    
    // Map controls
    document.getElementById('centerMapBtn').addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const userLocation = [position.coords.latitude, position.coords.longitude];
                map.setView(userLocation, 15);
            });
        }
    });

    // Traffic layer functionality (simplified for OpenStreetMap)
    let trafficVisible = false;
    document.getElementById('toggleTrafficBtn').addEventListener('click', function() {
        if (trafficVisible) {
            // Remove traffic overlay (if any custom implementation)
            trafficVisible = false;
            this.style.backgroundColor = 'white';
            this.style.color = '#667eea';
        } else {
            // Add traffic overlay (OpenStreetMap doesn't have built-in traffic, but we keep the UI)
            trafficVisible = true;
            this.style.backgroundColor = '#667eea';
            this.style.color = 'white';
            // Note: For real traffic data, you could integrate with other services
        }
    });

    // Sidebar toggle functionality
    let sidebarVisible = true;
    document.getElementById('toggleSidebarBtn').addEventListener('click', function() {
        const sidebar = document.querySelector('.sidebar');
        const container = document.querySelector('.container');
        
        if (sidebarVisible) {
            sidebar.style.display = 'none';
            container.classList.add('sidebar-hidden');
            this.style.backgroundColor = '#667eea';
            this.style.color = 'white';
            this.querySelector('i').className = 'fas fa-times';
            this.title = 'Show Travel Plan';
            
            // Trigger map resize after sidebar is hidden
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                }
            }, 300);
        } else {
            sidebar.style.display = 'flex';
            container.classList.remove('sidebar-hidden');
            this.style.backgroundColor = 'white';
            this.style.color = '#667eea';
            this.querySelector('i').className = 'fas fa-bars';
            this.title = 'Toggle Travel Plan';
            
            // Trigger map resize after sidebar is shown
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                }
            }, 300);
        }
        
        sidebarVisible = !sidebarVisible;
    });

    console.log('Google Maps initialized successfully');
    
    // Prevent unwanted touch behaviors on mobile
    setupMobileTouchHandling();
}

// Setup mobile touch handling to prevent page zoom/scroll
function setupMobileTouchHandling() {
    // Prevent default touch behaviors on the body
    document.body.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault(); // Prevent pinch zoom
        }
    }, { passive: false });

    document.body.addEventListener('touchend', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault(); // Prevent pinch zoom
        }
    }, { passive: false });

    document.body.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault(); // Prevent pinch zoom
        }
        // Allow single touch only on map and sidebar
        const target = e.target.closest('#map, .sidebar');
        if (!target) {
            e.preventDefault();
        }
    }, { passive: false });

    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            const target = event.target.closest('#map');
            if (!target) {
                event.preventDefault();
            }
        }
        lastTouchEnd = now;
    }, false);

    // Prevent pull-to-refresh on Safari
    let startY;
    document.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        if (!e.target.closest('.sidebar')) {
            const y = e.touches[0].clientY;
            if (startY <= 10 && y > startY) {
                e.preventDefault();
            }
        }
    }, { passive: false });
}

// Initialize app event listeners
function initializeApp() {
    // Header buttons
    document.getElementById('newTripBtn').addEventListener('click', createNewTrip);
    
    // Sidebar buttons
    document.getElementById('addDayBtn').addEventListener('click', addNewDay);
    document.getElementById('importBtn').addEventListener('click', openImportDialog);
    document.getElementById('exportBtn').addEventListener('click', exportTravelPlan);
    document.getElementById('clearBtn').addEventListener('click', clearAllData);
    
    // File input for importing
    document.getElementById('importFileInput').addEventListener('change', handleImportFile);
    
    // Date inputs
    document.getElementById('startDate').addEventListener('change', updateTravelDates);
    document.getElementById('endDate').addEventListener('change', updateTravelDates);
    
    // Location modal events
    const locationModal = document.getElementById('locationModal');
    const locationCloseBtn = locationModal.querySelector('.close');
    const locationCancelBtn = document.getElementById('cancelLocationBtn');
    const locationForm = document.getElementById('locationForm');
    
    locationCloseBtn.addEventListener('click', () => locationModal.style.display = 'none');
    locationCancelBtn.addEventListener('click', () => locationModal.style.display = 'none');
    locationForm.addEventListener('submit', handleLocationSubmit);
    
    // Search location button
    document.getElementById('searchLocationBtn').addEventListener('click', searchLocationWithGoogle);
    
    // Auto-geocode when Google address field changes
    const googleAddressField = document.getElementById('googleAddress');
    if (googleAddressField) {
        googleAddressField.addEventListener('input', debounceGeocodeAddress);
        console.log('✅ Auto-geocoding listener attached to googleAddress field');
    } else {
        console.error('❌ Could not find googleAddress field');
    }
    
    // Clear coordinates button
    const clearCoordsBtn = document.getElementById('clearCoordinatesBtn');
    if (clearCoordsBtn) {
        clearCoordsBtn.addEventListener('click', clearCoordinates);
        console.log('✅ Clear coordinates listener attached');
    } else {
        console.error('❌ Could not find clearCoordinatesBtn');
    }
    
    // Manual update coordinates button
    const updateCoordsBtn = document.getElementById('updateCoordinatesBtn');
    if (updateCoordsBtn) {
        updateCoordsBtn.addEventListener('click', function() {
            const googleAddress = document.getElementById('googleAddress').value.trim();
            if (googleAddress) {
                console.log('🔴 Manual geocoding triggered for:', googleAddress);
                geocodeAddressQuietly(googleAddress);
            } else {
                alert('Please enter a Google Maps address first.');
            }
        });
        console.log('✅ Manual update coordinates listener attached');
    } else {
        console.error('❌ Could not find updateCoordinatesBtn');
    }
    
    // Note modal events
    const noteModal = document.getElementById('noteModal');
    const noteCloseBtn = noteModal.querySelector('.close');
    const noteCancelBtn = document.getElementById('cancelNoteBtn');
    const noteForm = document.getElementById('noteForm');
    
    noteCloseBtn.addEventListener('click', () => noteModal.style.display = 'none');
    noteCancelBtn.addEventListener('click', () => noteModal.style.display = 'none');
    noteForm.addEventListener('submit', handleNoteSubmit);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === locationModal) {
            locationModal.style.display = 'none';
        }
        if (event.target === noteModal) {
            noteModal.style.display = 'none';
        }
    });
}

// Create a new trip
function createNewTrip() {
    if (confirm('This will clear your current travel plan. Continue?')) {
        clearAllData();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('startDate').value = today;
        addNewDay();
    }
}

// Add a new day to the travel plan
function addNewDay() {
    const startDate = document.getElementById('startDate').value;
    if (!startDate) {
        alert('Please set a start date first');
        return;
    }
    
    const dayNumber = travelPlan.days.length + 1;
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + (dayNumber - 1));
    
    const newDay = {
        id: 'day_' + Date.now(),
        number: dayNumber,
        date: dayDate.toISOString().split('T')[0],
        items: [] // Use new unified structure
    };
    
    travelPlan.days.push(newDay);
    renderDays();
    saveTravelPlan();
}

// Render all days
function renderDays() {
    const daysList = document.getElementById('daysList');
    daysList.innerHTML = '';
    
    travelPlan.days.forEach(day => {
        const dayCard = createDayCard(day);
        daysList.appendChild(dayCard);
    });
    
    // Add drag and drop event listeners
    setupDragAndDrop();
    
    updateMapMarkers();
}

// Get combined items (locations and notes) in their display order
function getCombinedItems(day) {
    if (!day.items) {
        // Migrate old data structure to new combined structure
        const items = [];
        
        // Add existing locations with type
        if (day.locations) {
            day.locations.forEach(location => {
                items.push({ ...location, type: 'location' });
            });
        }
        
        // Add existing notes with type
        if (day.notes) {
            day.notes.forEach(note => {
                items.push({ ...note, type: 'note' });
            });
        }
        
        // Store the combined items and remove old arrays
        day.items = items;
        delete day.locations;
        delete day.notes;
    }
    
    return day.items || [];
}

// Create a day card element
function createDayCard(day) {
    const isSelected = selectedDayId === day.id;
    const dayCard = document.createElement('div');
    dayCard.className = `day-card ${isSelected ? 'selected' : ''}`;
    dayCard.innerHTML = `
        <div class="day-header">
            <div>
                <div class="day-title">Day ${day.number}</div>
                <div class="day-date">${formatDate(day.date)}</div>
            </div>
            <div class="day-actions">
                <button class="control-btn day-view-btn ${isSelected ? 'active' : ''}" onclick="toggleDayView('${day.id}')" title="${isSelected ? 'Show All Days' : 'Show Only This Day'}">
                    <i class="fas ${isSelected ? 'fa-filter' : 'fa-layer-group'}"></i>
                </button>
                <button class="delete-location" onclick="deleteDay('${day.id}')" title="Delete Day">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="day-controls">
            <div class="add-location-btn" onclick="openLocationModal('${day.id}')">
                <i class="fas fa-map-marker-alt"></i> Add Location
            </div>
            <div class="add-note-btn" onclick="openNoteModal('${day.id}')">
                <i class="fas fa-sticky-note"></i> Add Note
            </div>
        </div>
        <div class="locations-list" id="locations_${day.id}">
            ${getCombinedItems(day).map(item => {
                if (item.type === 'location') {
                    return createLocationHTML(item, day.id);
                } else {
                    return createNoteHTML(item, day.id);
                }
            }).join('')}
        </div>
    `;
    
    return dayCard;
}

// Create location HTML with click functionality
function createLocationHTML(item, dayId) {
    return `
        <div class="location-item clickable draggable" 
             data-item-id="${item.id}" 
             data-day-id="${dayId}"
             data-item-type="location"
             draggable="true">
            <div class="drag-handle" title="Drag to reorder">
                <i class="fas fa-grip-vertical"></i>
            </div>
            <div class="item-actions">
                <button class="edit-item" onclick="event.stopPropagation(); editLocation('${dayId}', '${item.id}')" title="Edit Location">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-location" onclick="event.stopPropagation(); deleteItem('${dayId}', '${item.id}')" title="Delete Location">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="location-content" onclick="event.stopPropagation(); focusLocationOnMap('${item.id}', ${item.lat}, ${item.lng})">
                <div class="location-name">${item.name}</div>
                ${item.googleAddress ? `<div class="location-google-address"><i class="fas fa-map-marker-alt"></i> ${item.googleAddress}</div>` : ''}
                ${item.time ? `<div class="location-time"><i class="fas fa-clock"></i> ${item.time}</div>` : ''}
                ${item.notes ? `<div class="location-notes">${item.notes}</div>` : ''}
                ${item.googleAddress ? `
                    <div class="location-google-maps">
                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.googleAddress)}" 
                           target="_blank" 
                           onclick="event.stopPropagation()"
                           class="google-maps-link">
                            <i class="fas fa-directions"></i> Open in Google Maps
                        </a>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Create note HTML
function createNoteHTML(item, dayId) {
    return `
        <div class="note-item draggable" 
             data-item-id="${item.id}"
             data-day-id="${dayId}"
             data-item-type="note"
             draggable="true">
            <div class="drag-handle" title="Drag to reorder">
                <i class="fas fa-grip-vertical"></i>
            </div>
            <div class="item-actions">
                <button class="edit-item" onclick="event.stopPropagation(); editNote('${dayId}', '${item.id}')" title="Edit Note">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-location" onclick="event.stopPropagation(); deleteItem('${dayId}', '${item.id}')" title="Delete Note">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="note-content">${item.content}</div>
            <div class="note-timestamp">${formatTimestamp(item.timestamp)}</div>
        </div>
    `;
}

// Open location modal
function openLocationModal(dayId) {
    console.log('Opening location modal for day:', dayId);
    currentDayId = dayId;
    editingMode = false;
    editingItemId = null;
    const modal = document.getElementById('locationModal');
    if (modal) {
        // Update modal title for create mode
        modal.querySelector('h3').textContent = 'Add Location';
        modal.querySelector('button[type="submit"]').textContent = 'Add Location';
        modal.style.display = 'block';
        document.getElementById('locationForm').reset();
        
        // Hide coordinates section for new locations
        document.querySelector('.coordinates-group').style.display = 'none';
        document.getElementById('locationLat').value = '';
        document.getElementById('locationLng').value = '';
    } else {
        console.error('Location modal not found!');
        alert('Error: Location modal not found. Please refresh the page.');
    }
}

// Edit location function
function editLocation(dayId, itemId) {
    console.log('Editing location:', dayId, itemId);
    const day = travelPlan.days.find(d => d.id === dayId);
    if (!day) return;
    
    const item = getCombinedItems(day).find(item => item.id === itemId && item.type === 'location');
    if (!item) return;
    
    // Set edit mode
    currentDayId = dayId;
    editingMode = true;
    editingItemId = itemId;
    
    const modal = document.getElementById('locationModal');
    if (modal) {
        // Update modal title for edit mode
        modal.querySelector('h3').textContent = 'Edit Location';
        modal.querySelector('button[type="submit"]').textContent = 'Save Changes';
        
        // Populate form with existing data
        document.getElementById('locationName').value = item.name || '';
        document.getElementById('googleAddress').value = item.googleAddress || '';
        document.getElementById('locationTime').value = item.time || '';
        document.getElementById('locationNotes').value = item.notes || '';
        
        // Show coordinates if available
        if (item.lat && item.lng) {
            document.getElementById('locationLat').value = item.lat;
            document.getElementById('locationLng').value = item.lng;
            document.querySelector('.coordinates-group').style.display = 'block';
        }
        
        modal.style.display = 'block';
    }
}

// Handle location form submission
function handleLocationSubmit(e) {
    e.preventDefault();
    console.log('Location form submitted');
    
    const name = document.getElementById('locationName').value;
    const googleAddress = document.getElementById('googleAddress').value;
    const time = document.getElementById('locationTime').value;
    const notes = document.getElementById('locationNotes').value;
    
    console.log('Form data:', { name, googleAddress, time, notes, currentDayId, editingMode });
    
    // Validate required fields
    if (!name) {
        alert('Please fill in the location name.');
        return;
    }
    
    // Check if geocoder is available
    if (!geocoder) {
        alert('Map is still loading. Please wait a moment and try again.');
        return;
    }
    
    if (editingMode && editingItemId) {
        // Edit existing location
        const day = travelPlan.days.find(d => d.id === currentDayId);
        if (day) {
            const item = getCombinedItems(day).find(item => item.id === editingItemId);
            if (item) {
                // Check if we have coordinates from Google search
                const lat = parseFloat(document.getElementById('locationLat').value);
                const lng = parseFloat(document.getElementById('locationLng').value);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    // Use Google coordinates
                    item.name = name;
                    item.googleAddress = googleAddress;
                    item.time = time;
                    item.notes = notes;
                    item.lat = lat;
                    item.lng = lng;
                    
                    renderDays();
                    saveTravelPlan();
                    document.getElementById('locationModal').style.display = 'none';
                    editingMode = false;
                    editingItemId = null;
                } else if (item.name !== name) {
                    // Fall back to OpenStreetMap geocoding if name changed
                    geocoder.geocode(name, function(results) {
                        if (results && results.length > 0) {
                            item.name = name;
                            item.googleAddress = googleAddress;
                            item.time = time;
                            item.notes = notes;
                            item.lat = results[0].center.lat;
                            item.lng = results[0].center.lng;
                            
                            renderDays();
                            saveTravelPlan();
                            document.getElementById('locationModal').style.display = 'none';
                            editingMode = false;
                            editingItemId = null;
                        } else {
                            alert('Could not find the location. Please try using the search button for better results.');
                        }
                    });
                } else {
                    // Name unchanged, just update other fields
                    item.name = name;
                    item.googleAddress = googleAddress;
                    item.time = time;
                    item.notes = notes;
                    
                    renderDays();
                    saveTravelPlan();
                    document.getElementById('locationModal').style.display = 'none';
                    editingMode = false;
                    editingItemId = null;
                }
            }
        }
    } else {
        // Create new location
        const lat = parseFloat(document.getElementById('locationLat').value);
        const lng = parseFloat(document.getElementById('locationLng').value);
        
        if (!isNaN(lat) && !isNaN(lng)) {
            // Use Google coordinates
            const location = {
                id: 'loc_' + Date.now(),
                name: name,
                googleAddress: googleAddress,
                time: time,
                notes: notes,
                lat: lat,
                lng: lng
            };
            
            console.log('Adding location with Google coordinates:', location);
            addLocationToDay(currentDayId, location);
            document.getElementById('locationModal').style.display = 'none';
        } else {
            // Fall back to OpenStreetMap geocoding
            geocoder.geocode(name, function(results) {
                console.log('Geocoding result:', results);
                if (results && results.length > 0) {
                    const location = {
                        id: 'loc_' + Date.now(),
                        name: name,
                        googleAddress: googleAddress,
                        time: time,
                        notes: notes,
                        lat: results[0].center.lat,
                        lng: results[0].center.lng
                    };
                    
                    console.log('Adding location:', location);
                    addLocationToDay(currentDayId, location);
                    document.getElementById('locationModal').style.display = 'none';
                } else {
                    alert('Could not find the location. Please try using the search button for better results.');
                }
            });
        }
    }
}

// Add location to a specific day
function addLocationToDay(dayId, location) {
    console.log('Adding location to day:', dayId, location);
    const day = travelPlan.days.find(d => d.id === dayId);
    if (day) {
        // Ensure day has items array
        if (!day.items) {
            day.items = [];
        }
        
        // Add type to location
        const locationWithType = { ...location, type: 'location' };
        day.items.push(locationWithType);
        
        console.log('Location added successfully. Day now has', day.items.length, 'items');
        renderDays();
        saveTravelPlan();
    } else {
        console.error('Day not found:', dayId);
        alert('Error: Could not find the day to add location to.');
    }
}

// Focus on a specific location on the map
function focusLocationOnMap(locationId, lat, lng) {
    const position = [lat, lng];
    map.setView(position, 16);
    
    // Find and trigger the marker's popup
    const marker = markers.find(m => m.locationId === locationId);
    if (marker && marker.getPopup()) {
        marker.openPopup();
    }
}

// Toggle day view (show only selected day or all days)
function toggleDayView(dayId) {
    if (selectedDayId === dayId) {
        selectedDayId = null; // Show all days
    } else {
        selectedDayId = dayId; // Show only this day
    }
    renderDays();
    updateMapMarkers();
}

// Open note modal
function openNoteModal(dayId) {
    currentDayId = dayId;
    editingMode = false;
    editingItemId = null;
    const modal = document.getElementById('noteModal');
    if (modal) {
        // Update modal title for create mode
        modal.querySelector('h3').textContent = 'Add Note';
        modal.querySelector('button[type="submit"]').textContent = 'Add Note';
        modal.style.display = 'block';
        document.getElementById('noteForm').reset();
    }
}

// Edit note function
function editNote(dayId, itemId) {
    console.log('Editing note:', dayId, itemId);
    const day = travelPlan.days.find(d => d.id === dayId);
    if (!day) return;
    
    const item = getCombinedItems(day).find(item => item.id === itemId && item.type === 'note');
    if (!item) return;
    
    // Set edit mode
    currentDayId = dayId;
    editingMode = true;
    editingItemId = itemId;
    
    const modal = document.getElementById('noteModal');
    if (modal) {
        // Update modal title for edit mode
        modal.querySelector('h3').textContent = 'Edit Note';
        modal.querySelector('button[type="submit"]').textContent = 'Save Changes';
        
        // Populate form with existing data
        document.getElementById('noteContent').value = item.content || '';
        
        modal.style.display = 'block';
    }
}

// Handle note form submission
function handleNoteSubmit(e) {
    e.preventDefault();
    
    const content = document.getElementById('noteContent').value;
    
    if (!content.trim()) {
        alert('Please enter some content for the note.');
        return;
    }
    
    if (editingMode && editingItemId) {
        // Edit existing note
        const day = travelPlan.days.find(d => d.id === currentDayId);
        if (day) {
            const item = getCombinedItems(day).find(item => item.id === editingItemId);
            if (item) {
                item.content = content;
                // Keep original timestamp, but could add an "edited" timestamp if desired
                
                renderDays();
                saveTravelPlan();
                document.getElementById('noteModal').style.display = 'none';
                editingMode = false;
                editingItemId = null;
            }
        }
    } else {
        // Create new note
        const note = {
            id: 'note_' + Date.now(),
            content: content,
            timestamp: new Date().toISOString()
        };
        
        addNoteToDay(currentDayId, note);
        document.getElementById('noteModal').style.display = 'none';
    }
}

// Add note to a specific day
function addNoteToDay(dayId, note) {
    const day = travelPlan.days.find(d => d.id === dayId);
    if (day) {
        // Ensure day has items array
        if (!day.items) {
            day.items = [];
        }
        
        // Add type to note
        const noteWithType = { ...note, type: 'note' };
        day.items.push(noteWithType);
        
        renderDays();
        saveTravelPlan();
    }
}

// Unified delete function for both locations and notes
function deleteItem(dayId, itemId) {
    const day = travelPlan.days.find(d => d.id === dayId);
    if (day) {
        // Handle new structure
        if (day.items) {
            day.items = day.items.filter(item => item.id !== itemId);
        } else {
            // Handle old structure for backward compatibility
            if (day.locations) {
                day.locations = day.locations.filter(loc => loc.id !== itemId);
            }
            if (day.notes) {
                day.notes = day.notes.filter(note => note.id !== itemId);
            }
        }
        renderDays();
        saveTravelPlan();
    }
}

// Keep old functions for backward compatibility
function deleteNote(dayId, noteId) {
    deleteItem(dayId, noteId);
}

function deleteLocation(dayId, locationId) {
    deleteItem(dayId, locationId);
}

// Delete a day
function deleteDay(dayId) {
    if (confirm('Delete this day and all its locations?')) {
        travelPlan.days = travelPlan.days.filter(d => d.id !== dayId);
        // Renumber days
        travelPlan.days.forEach((day, index) => {
            day.number = index + 1;
        });
        renderDays();
        saveTravelPlan();
    }
}

// Update map markers with day filtering
function updateMapMarkers() {
    // Clear existing markers
    markerLayer.clearLayers();
    markers = [];
    
    const bounds = [];
    let hasLocations = false;
    
    // Filter days based on selection
    const daysToShow = selectedDayId ? 
        travelPlan.days.filter(day => day.id === selectedDayId) : 
        travelPlan.days;
    
    // Add markers for each location
    daysToShow.forEach((day, dayIndex) => {
        const originalDayIndex = travelPlan.days.findIndex(d => d.id === day.id);
        const items = getCombinedItems(day);
        const locations = items.filter(item => item.type === 'location');
        
        locations.forEach((location, locationIndex) => {
            // Create custom marker icon
            const dayColor = getColorForDay(originalDayIndex);
            const markerHtml = `
                <div style="
                    background-color: ${dayColor};
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 3px solid white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 14px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                ">${originalDayIndex + 1}</div>
            `;
            
            const customIcon = L.divIcon({
                html: markerHtml,
                className: 'custom-marker',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -20]
            });
            
            const marker = L.marker([location.lat, location.lng], {
                icon: customIcon,
                title: location.name
            });
            
            // Store location ID for reference
            marker.locationId = location.id;
            
            // Popup content with Google Maps navigation - use Google address if available, otherwise fall back to location name
            const addressForNavigation = location.googleAddress || location.name;
            const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressForNavigation)}`;
            const popupContent = `
                <div style="max-width: 200px;">
                    <h4 style="margin: 0 0 5px 0; color: #333;">${location.name}</h4>
                    ${location.googleAddress ? 
                        `<p style="margin: 0 0 5px 0; color: #4285f4; font-size: 0.8em;"><i class="fas fa-map-marker-alt"></i> Google Maps: ${location.googleAddress}</p>` : 
                        ''
                    }
                    ${location.time ? `<p style="margin: 0 0 5px 0; color: #667eea; font-size: 0.85em;"><i class="fas fa-clock"></i> ${location.time}</p>` : ''}
                    ${location.notes ? `<p style="margin: 0 0 8px 0; color: #666; font-size: 0.85em; font-style: italic;">${location.notes}</p>` : ''}
                    <div style="text-align: center; margin-top: 8px;">
                        <a href="${googleMapsUrl}" target="_blank" style="
                            background: #4285f4;
                            color: white;
                            padding: 6px 12px;
                            border-radius: 4px;
                            text-decoration: none;
                            font-size: 0.8em;
                            display: inline-block;
                            font-weight: 500;
                        ">
                            <i class="fas fa-directions"></i> Open in Google Maps
                        </a>
                    </div>
                </div>
            `;
            
            marker.bindPopup(popupContent);
            marker.addTo(markerLayer);
            markers.push(marker);
            bounds.push([location.lat, location.lng]);
            hasLocations = true;
        });
    });
    
    // Fit map to show all markers
    if (hasLocations) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds(), { padding: [20, 20] });
        if (map.getZoom() > 15) {
            map.setZoom(15);
        }
    }
    
    // Note: Route drawing has been removed to reduce map clutter
    // drawDailyRoutes();
}

// Get color for day markers
function getColorForDay(dayIndex) {
    const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#ff9a9e', '#a8edea', '#ffecd2'];
    return colors[dayIndex % colors.length];
}

// Draw routes between locations for each day (DISABLED - removed to reduce map clutter)
// function drawDailyRoutes() {
//     const daysToShow = selectedDayId ? 
//         travelPlan.days.filter(day => day.id === selectedDayId) : 
//         travelPlan.days;
//         
//     daysToShow.forEach(day => {
//         const items = getCombinedItems(day);
//         const locations = items.filter(item => item.type === 'location');
//         
//         if (locations.length > 1) {
//             const waypoints = locations.slice(1, -1).map(location => ({
//                 location: { lat: location.lat, lng: location.lng },
//                 stopover: true
//             }));
//             
//             const start = locations[0];
//             const end = locations[locations.length - 1];
//             
//             directionsService.route({
//                 origin: { lat: start.lat, lng: start.lng },
//                 destination: { lat: end.lat, lng: end.lng },
//                 waypoints: waypoints,
//                 travelMode: google.maps.TravelMode.DRIVING
//             }, function(result, status) {
//                 if (status === 'OK') {
//                     const routeRenderer = new google.maps.DirectionsRenderer({
//                         directions: result,
//                         suppressMarkers: true,
//                         polylineOptions: {
//                             strokeColor: getColorForDay(day.number - 1),
//                             strokeOpacity: 0.7,
//                             strokeWeight: 4
//                         }
//                     });
//                     routeRenderer.setMap(map);
//                 }
//             });
//         }
//     });
// }

// Update travel dates
function updateTravelDates() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    travelPlan.startDate = startDate;
    travelPlan.endDate = endDate;
    
    // Update day dates if start date changed
    if (startDate) {
        travelPlan.days.forEach((day, index) => {
            const dayDate = new Date(startDate);
            dayDate.setDate(dayDate.getDate() + index);
            day.date = dayDate.toISOString().split('T')[0];
        });
        renderDays();
    }
    
    saveTravelPlan();
}

// Export travel plan
function exportTravelPlan() {
    const dataStr = JSON.stringify(travelPlan, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'travel-plan.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Open import dialog
function openImportDialog() {
    document.getElementById('importFileInput').click();
}

// Handle import file selection
function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        alert('Please select a valid JSON file.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            importTravelPlan(importedData);
        } catch (error) {
            alert('Error reading file: Invalid JSON format.');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
    
    // Reset the file input
    event.target.value = '';
}

// Import travel plan from JSON data
function importTravelPlan(importedData) {
    // Validate the imported data structure
    if (!validateTravelPlanData(importedData)) {
        alert('Invalid travel plan format. Please check your file.');
        return;
    }
    
    if (travelPlan.days.length > 0) {
        if (!confirm('This will replace your current travel plan. Continue?')) {
            return;
        }
    }
    
    // Import the data
    travelPlan = {
        title: importedData.title || 'My Travel Plan',
        startDate: importedData.startDate || '',
        endDate: importedData.endDate || '',
        days: importedData.days || []
    };
    
    // Ensure all days are migrated to the new structure
    travelPlan.days.forEach(day => {
        getCombinedItems(day); // This will migrate old structure to new if needed
    });
    
    // Update the UI
    document.getElementById('startDate').value = travelPlan.startDate;
    document.getElementById('endDate').value = travelPlan.endDate;
    
    // Reset selected day view
    selectedDayId = null;
    
    // Render the imported plan
    renderDays();
    saveTravelPlan();
    
    alert('Travel plan imported successfully!');
}

// Validate travel plan data structure
function validateTravelPlanData(data) {
    // Check if data is an object
    if (!data || typeof data !== 'object') {
        return false;
    }
    
    // Check for required properties
    if (!data.hasOwnProperty('days') || !Array.isArray(data.days)) {
        return false;
    }
    
    // Validate each day
    for (const day of data.days) {
        if (!day || typeof day !== 'object') {
            return false;
        }
        
        // Check required day properties
        if (!day.hasOwnProperty('id') || !day.hasOwnProperty('number') || 
            !day.hasOwnProperty('date')) {
            return false;
        }
        
        // Handle both old and new data structures
        const hasOldStructure = day.hasOwnProperty('locations');
        const hasNewStructure = day.hasOwnProperty('items');
        
        if (!hasOldStructure && !hasNewStructure) {
            return false;
        }
        
        // Validate old structure (separate locations and notes arrays)
        if (hasOldStructure) {
            // Validate locations array
            if (!Array.isArray(day.locations)) {
                return false;
            }
            
            // Validate each location
            for (const location of day.locations) {
                if (!validateLocationItem(location)) {
                    return false;
                }
            }
            
            // Validate notes array if it exists
            if (day.hasOwnProperty('notes')) {
                if (!Array.isArray(day.notes)) {
                    return false;
                }
                
                // Validate each note
                for (const note of day.notes) {
                    if (!validateNoteItem(note)) {
                        return false;
                    }
                }
            }
        }
        
        // Validate new structure (unified items array)
        if (hasNewStructure) {
            if (!Array.isArray(day.items)) {
                return false;
            }
            
            // Validate each item
            for (const item of day.items) {
                if (!item || typeof item !== 'object') {
                    return false;
                }
                
                if (!item.hasOwnProperty('type') || !item.hasOwnProperty('id')) {
                    return false;
                }
                
                if (item.type === 'location') {
                    if (!validateLocationItem(item)) {
                        return false;
                    }
                } else if (item.type === 'note') {
                    if (!validateNoteItem(item)) {
                        return false;
                    }
                } else {
                    return false; // Unknown item type
                }
            }
        }
    }
    
    return true;
}

// Helper function to validate location items
function validateLocationItem(location) {
    if (!location || typeof location !== 'object') {
        return false;
    }
    
    // Check required location properties
    if (!location.hasOwnProperty('id') || !location.hasOwnProperty('name') || 
        !location.hasOwnProperty('lat') || !location.hasOwnProperty('lng')) {
        return false;
    }
    
    // Validate coordinates are numbers
    if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return false;
    }
    
    return true;
}

// Helper function to validate note items
function validateNoteItem(note) {
    if (!note || typeof note !== 'object') {
        return false;
    }
    
    // Check required note properties
    if (!note.hasOwnProperty('id') || !note.hasOwnProperty('content') || 
        !note.hasOwnProperty('timestamp')) {
        return false;
    }
    
    return true;
}

// Clear all data
function clearAllData() {
    if (confirm('This will delete all your travel plans. Are you sure?')) {
        travelPlan = {
            title: 'My Travel Plan',
            startDate: '',
            endDate: '',
            days: []
        };
        
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        
        renderDays();
        saveTravelPlan();
    }
}

// Save travel plan to localStorage
function saveTravelPlan() {
    localStorage.setItem('travelPlan', JSON.stringify(travelPlan));
}

// Load travel plan from localStorage
function loadTravelPlan() {
    const saved = localStorage.getItem('travelPlan');
    if (saved) {
        try {
            travelPlan = JSON.parse(saved);
            document.getElementById('startDate').value = travelPlan.startDate || '';
            document.getElementById('endDate').value = travelPlan.endDate || '';
            renderDays();
        } catch (e) {
            console.error('Error loading travel plan:', e);
        }
    }
}

// Format date for display
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Format timestamp for display
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

// Debounce timer for address input
let addressInputTimer = null;

// Debounced geocoding for address input
function debounceGeocodeAddress() {
    console.log('🔄 Address input detected, starting debounce...');
    
    // Clear previous timer
    if (addressInputTimer) {
        clearTimeout(addressInputTimer);
        console.log('⏰ Cleared previous timer');
    }
    
    // Set new timer
    addressInputTimer = setTimeout(() => {
        const googleAddress = document.getElementById('googleAddress').value.trim();
        console.log('📍 Debounce timer fired. Address:', googleAddress);
        
        if (googleAddress && googleAddress.length > 3) {
            console.log('✅ Address length sufficient, starting geocoding...');
            geocodeAddressQuietly(googleAddress);
        } else {
            console.log('❌ Address too short or empty, skipping geocoding');
        }
    }, 1000); // Reduced to 1 second for faster response
}

// Quiet geocoding without alerts/notifications (for auto-updates)
async function geocodeAddressQuietly(address) {
    const coordsGroup = document.querySelector('.coordinates-group');
    const googleAddressField = document.getElementById('googleAddress');
    
    try {
        // Show loading state
        console.log('🔍 Starting auto-geocoding for:', address);
        googleAddressField.style.borderColor = '#f59e0b';
        googleAddressField.style.backgroundColor = '#fef3c7';
        
        // Check if API key is available
        if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.trim() === '') {
            console.error('❌ No Google Maps API key found');
            return;
        }
        
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
        console.log('🌐 Making request to:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 API Response:', data);
        
        if (data.status === 'OK' && data.results.length > 0) {
            const result = data.results[0];
            const location = result.geometry.location;
            
            // Update coordinates
            document.getElementById('locationLat').value = location.lat;
            document.getElementById('locationLng').value = location.lng;
            coordsGroup.style.display = 'block';
            
            // Success visual feedback
            googleAddressField.style.borderColor = '#10b981';
            googleAddressField.style.backgroundColor = '#f0fdf4';
            coordsGroup.style.border = '2px solid #10b981';
            coordsGroup.style.backgroundColor = '#f0fdf4';
            
            // Reset after delay
            setTimeout(() => {
                googleAddressField.style.borderColor = '#eee';
                googleAddressField.style.backgroundColor = 'white';
                coordsGroup.style.border = '1px solid #e0e6ff';
                coordsGroup.style.backgroundColor = '#f8f9ff';
            }, 3000);
            
            console.log('✅ Auto-geocoding successful!');
            console.log('📍 Address:', result.formatted_address);
            console.log('🌍 Coordinates:', location.lat, location.lng);
            
        } else {
            // Error visual feedback
            googleAddressField.style.borderColor = '#ef4444';
            googleAddressField.style.backgroundColor = '#fef2f2';
            
            setTimeout(() => {
                googleAddressField.style.borderColor = '#eee';
                googleAddressField.style.backgroundColor = 'white';
            }, 3000);
            
            console.log('❌ Auto-geocoding failed for:', address);
            console.log('📊 Status:', data.status);
            console.log('📄 Full response:', data);
        }
    } catch (error) {
        // Error visual feedback
        googleAddressField.style.borderColor = '#ef4444';
        googleAddressField.style.backgroundColor = '#fef2f2';
        
        setTimeout(() => {
            googleAddressField.style.borderColor = '#eee';
            googleAddressField.style.backgroundColor = 'white';
        }, 3000);
        
        console.error('💥 Auto-geocoding error:', error);
        console.error('🔧 Check your internet connection and API key');
    }
}

// Clear coordinates function
function clearCoordinates() {
    document.getElementById('locationLat').value = '';
    document.getElementById('locationLng').value = '';
    document.querySelector('.coordinates-group').style.display = 'none';
    console.log('Coordinates cleared');
}

// Google Maps Geocoding function
async function searchLocationWithGoogle() {
    const locationName = document.getElementById('locationName').value.trim();
    const searchBtn = document.getElementById('searchLocationBtn');
    
    if (!locationName) {
        alert('Please enter a location name first.');
        return;
    }
    
    // Disable button and show loading state
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&key=${GOOGLE_MAPS_API_KEY}`;
        console.log('Making request to:', url);
        console.log('Using API key:', GOOGLE_MAPS_API_KEY ? 'Key is set' : 'No API key found');
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('API Response:', data);
        console.log('Response status:', data.status);
        
        if (data.status === 'OK' && data.results.length > 0) {
            const result = data.results[0];
            const location = result.geometry.location;
            
            // Show coordinates in the form
            document.getElementById('locationLat').value = location.lat;
            document.getElementById('locationLng').value = location.lng;
            document.querySelector('.coordinates-group').style.display = 'block';
            
            // Auto-fill Google address if not already filled
            if (!document.getElementById('googleAddress').value) {
                document.getElementById('googleAddress').value = result.formatted_address;
            }
            
            // Show success message
            const coordsGroup = document.querySelector('.coordinates-group');
            coordsGroup.style.border = '2px solid #10b981';
            coordsGroup.style.backgroundColor = '#f0fdf4';
            
            // Show success notification
            console.log('✅ Google Maps geocoding successful!');
            alert(`✅ Found location: ${result.formatted_address}\nCoordinates: ${location.lat}, ${location.lng}`);
            
            setTimeout(() => {
                coordsGroup.style.border = '1px solid #e0e6ff';
                coordsGroup.style.backgroundColor = '#f8f9ff';
            }, 3000);
            
        } else {
            let errorMessage = 'Could not find location: ';
            switch(data.status) {
                case 'ZERO_RESULTS':
                    errorMessage += 'No results found for this location.';
                    break;
                case 'REQUEST_DENIED':
                    errorMessage += 'API key issue. Please check:\n1. Enable Geocoding API in Google Cloud Console\n2. Check API key restrictions\n3. Ensure billing is enabled';
                    break;
                case 'INVALID_REQUEST':
                    errorMessage += 'Invalid request. Please check the location name.';
                    break;
                case 'OVER_QUERY_LIMIT':
                    errorMessage += 'Query limit exceeded. Please try again later.';
                    break;
                default:
                    errorMessage += data.status;
            }
            if (data.error_message) {
                errorMessage += '\n\nDetails: ' + data.error_message;
            }
            alert(errorMessage);
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        alert('Error searching for location. Please try again.');
    } finally {
        // Re-enable button
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search"></i>';
    }
}

// OpenStreetMap doesn't require API key authentication

// Drag and Drop Variables
let draggedElement = null;
let draggedData = null;
let placeholder = null;

// Setup drag and drop event listeners
function setupDragAndDrop() {
    console.log('Setting up drag and drop...');
    const draggableItems = document.querySelectorAll('.draggable');
    console.log('Found draggable items:', draggableItems.length);
    
    draggableItems.forEach((item, index) => {
        console.log(`Setting up item ${index}:`, item);
        console.log(`Item classes:`, item.className);
        console.log(`Item datasets:`, item.dataset);
        
        // Check if this is a note or location
        const isNote = item.classList.contains('note-item');
        const isLocation = item.classList.contains('location-item');
        console.log(`Is note: ${isNote}, Is location: ${isLocation}`);
        
        // Ensure item is draggable
        item.setAttribute('draggable', 'true');
        
        // Remove any existing listeners to avoid duplicates
        item.removeEventListener('dragstart', handleDragStart);
        item.removeEventListener('dragend', handleDragEnd);
        
        // Add fresh listeners
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        
        console.log(`Listeners added to item ${index}`);
        
        // Prevent default drag behavior on buttons
        const buttons = item.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.setAttribute('draggable', 'false');
            btn.addEventListener('dragstart', (e) => e.preventDefault());
        });
    });
    
    // Add drop zone listeners to all location lists
    const locationLists = document.querySelectorAll('.locations-list');
    console.log('Found location lists:', locationLists.length);
    
    locationLists.forEach((list, index) => {
        console.log(`Setting up drop zone ${index}:`, list);
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('drop', handleDrop);
    });
    
    console.log('Drag and drop setup complete');
}

// Handle drag start
function handleDragStart(e) {
    console.log('Drag start event triggered');
    console.log('Event target:', e.target);
    console.log('Current element:', this);
    
    // For now, allow dragging from anywhere to test basic functionality
    // We'll add handle restriction back once basic dragging works
    
    draggedElement = this;
    draggedData = {
        itemType: this.dataset.itemType,
        itemId: this.dataset.itemId,
        dayId: this.dataset.dayId
    };
    
    console.log('Element datasets:', {
        itemType: this.dataset.itemType,
        itemId: this.dataset.itemId,
        dayId: this.dataset.dayId
    });
    
    console.log('Drag data set:', draggedData);
    
    // Add visual feedback
    this.classList.add('dragging');
    this.style.opacity = '0.5';
    
    // Create placeholder
    placeholder = document.createElement('div');
    placeholder.className = 'drag-placeholder';
    placeholder.style.height = this.offsetHeight + 'px';
    placeholder.style.background = 'rgba(102, 126, 234, 0.1)';
    placeholder.style.border = '2px dashed #667eea';
    placeholder.style.borderRadius = '8px';
    placeholder.style.margin = '8px 0';
    
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
    
    console.log('Drag started successfully:', draggedData);
}

// Handle drag end
function handleDragEnd(e) {
    // Clean up visual effects
    this.classList.remove('dragging');
    this.style.opacity = '';
    
    // Remove placeholder
    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    
    // Clean up
    draggedElement = null;
    draggedData = null;
    placeholder = null;
    
    console.log('Drag ended');
}

// Handle drag over - simplified and more reliable
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedElement || !draggedData) return;
    
    // Get the closest draggable item to the mouse position
    const afterElement = getDragAfterElement(this, e.clientY);
    
    // Remove existing placeholder
    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    
    // Insert placeholder at the correct position
    if (afterElement) {
        this.insertBefore(placeholder, afterElement);
    } else {
        this.appendChild(placeholder);
    }
}

// Handle drop
function handleDrop(e) {
    e.preventDefault();
    
    if (!draggedElement || !draggedData) return;
    
    // Get target day ID
    const targetDayId = this.id.replace('locations_', '');
    
    // Find the position where placeholder is
    let targetIndex = 0;
    const items = [...this.children];
    const placeholderIndex = items.indexOf(placeholder);
    
    if (placeholderIndex !== -1) {
        // Count only draggable items before the placeholder
        targetIndex = items.slice(0, placeholderIndex).filter(item => 
            item.classList.contains('draggable')).length;
    } else {
        targetIndex = items.filter(item => item.classList.contains('draggable')).length;
    }
    
    // Perform the reorder
    reorderItem(draggedData.dayId, targetDayId, draggedData.itemType, draggedData.itemId, targetIndex);
    
    console.log('Drop completed');
}

// Get the element after which to insert the dragged item
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Reorder item within the data structure - unified approach
function reorderItem(sourceDayId, targetDayId, itemType, itemId, targetIndex) {
    console.log('Reordering:', { sourceDayId, targetDayId, itemType, itemId, targetIndex });
    
    const sourceDay = travelPlan.days.find(d => d.id === sourceDayId);
    const targetDay = travelPlan.days.find(d => d.id === targetDayId);
    
    if (!sourceDay || !targetDay) {
        console.error('Source or target day not found');
        return;
    }
    
    // Ensure both days have items arrays
    getCombinedItems(sourceDay);
    getCombinedItems(targetDay);
    
    // Find the item in source day
    const item = sourceDay.items.find(item => item.id === itemId);
    if (!item) {
        console.error('Item not found:', itemId);
        return;
    }
    
    // Remove from source
    const sourceIndex = sourceDay.items.indexOf(item);
    sourceDay.items.splice(sourceIndex, 1);
    
    // Adjust target index if moving within the same day and after the original position
    if (sourceDayId === targetDayId && targetIndex > sourceIndex) {
        targetIndex--;
    }
    
    // Insert at target position
    targetDay.items.splice(targetIndex, 0, item);
    
    console.log('Item reordered successfully');
    
    // Re-render and save
    renderDays();
    saveTravelPlan();
}

// Global functions (needed for onclick handlers)
window.openLocationModal = openLocationModal;
window.editLocation = editLocation;
window.editNote = editNote;
window.deleteLocation = deleteLocation;
window.deleteNote = deleteNote;
window.deleteItem = deleteItem;
window.deleteDay = deleteDay;
window.focusLocationOnMap = focusLocationOnMap;
window.toggleDayView = toggleDayView;
window.openNoteModal = openNoteModal;
window.openImportDialog = openImportDialog; 