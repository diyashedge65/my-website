// Main JavaScript file for Emotion-Based Music Player Application

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const modelStatusValue = document.getElementById('modelStatusValue');
    const songsPlayedValue = document.getElementById('songsPlayedValue');
    
    // Music Player Elements
    const audioPlayer = document.getElementById('audioPlayer');
    const nowPlaying = document.getElementById('nowPlaying');
    const currentSongPath = document.getElementById('currentSongPath');
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressBar = document.getElementById('progressBar');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');
    
    // Music Player Variables
    let currentPlaylist = [];
    let currentSongIndex = -1;
    let isPlaying = false;
    
    // Camera elements
    const startCameraBtn = document.getElementById('startCamera');
    const stopCameraBtn = document.getElementById('stopCamera');
    const stopEmotionDetectionBtn = document.getElementById('stopEmotionDetection');
    const videoElement = document.getElementById('videoElement');
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');
    const detectedEmotion = document.getElementById('detectedEmotion');
    const confidenceLevel = document.getElementById('confidenceLevel');
    const faceStatus = document.getElementById('faceStatus');
    
    // Variables
    let emotionDetectionActive = false;
    let emotionDetectionInterval = null;

    // Update model status
    function updateModelStatus() {
        // Simple status update - no backend call needed for this simplified version
        modelStatusValue.textContent = 'Ready';
    }


    
    // Start camera functionality
    startCameraBtn.addEventListener('click', function() {
        startCamera();
    });
    
    // Stop camera functionality
    stopCameraBtn.addEventListener('click', function() {
        stopCamera();
    });
    
    // Stop emotion detection functionality
    stopEmotionDetectionBtn.addEventListener('click', function() {
        stopEmotionDetection();
        showNotification('Emotion detection stopped', 'info');
    });
    
    // Function to start camera
    function startCamera() {
        console.log('Starting camera...');
        
        // Request access to the camera
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            })
                .then(function(stream) {
                    console.log('Camera access granted');
                    videoElement.srcObject = stream;
                    videoElement.play();
                    videoElement.style.display = 'block';
                    cameraPlaceholder.style.display = 'none';
                    
                    // Start emotion detection
                    startEmotionDetection();
                    
                    showNotification('Camera started successfully', 'success');
                    console.log('Camera started successfully');
                })
                .catch(function(err) {
                    console.error('Error accessing camera:', err);
                    showNotification('Error accessing camera: ' + err.message, 'error');
                });
        } else {
            showNotification('Camera not supported in this browser', 'error');
        }
    }
    
    // Function to stop camera
    function stopCamera() {
        console.log('Stopping camera...');
        const stream = videoElement.srcObject;
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => {
                console.log('Stopping track:', track.kind, track.readyState);
                track.stop();
            });
            videoElement.srcObject = null;
        }
        
        videoElement.style.display = 'none';
        cameraPlaceholder.style.display = 'block';
        
        // Stop emotion detection only, keep music playing
        stopEmotionDetection();
        
        // Update camera status only
        faceStatus.textContent = 'Camera stopped';
        
        showNotification('Camera stopped', 'info');
        console.log('Camera stopped successfully');
    }
    
    // Start emotion detection
    function startEmotionDetection() {
        if (!emotionDetectionActive) {
            emotionDetectionActive = true;
            console.log('Starting emotion detection...');
            
            // Call backend endpoint to detect emotion from camera
            emotionDetectionInterval = setInterval(detectEmotionFromCamera, 2000); // Every 2 seconds
        }
    }
    
    // Stop emotion detection
    function stopEmotionDetection() {
        if (emotionDetectionActive && emotionDetectionInterval) {
            clearInterval(emotionDetectionInterval);
            emotionDetectionActive = false;
            console.log('Stopped emotion detection');
        }
    }
    
    // Detect emotion from camera
    async function detectEmotionFromCamera() {
        if (!videoElement.srcObject) {
            console.log('Camera is off, skipping emotion detection');
            return; // Don't process if camera is off
        }
        
        try {
            console.log('Capturing image for emotion detection...');
            // Capture image from video
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            
            // Check if dimensions are valid
            if (canvas.width === 0 || canvas.height === 0) {
                console.warn('Invalid video dimensions:', canvas.width, canvas.height);
                return;
            }
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            
            // Convert to blob and send to backend
            canvas.toBlob(async function(blob) {
                if (!blob) {
                    console.error('Failed to create image blob');
                    faceStatus.textContent = 'Image capture failed';
                    return;
                }
                
                const formData = new FormData();
                formData.append('image', blob, 'capture.jpg');
                
                try {
                    console.log('Sending image to backend for emotion detection...');
                    const response = await fetch('/detect_emotion_from_camera', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    console.log('Emotion detection result:', result);
                    
                    if (result.success) {
                        detectedEmotion.textContent = result.emotion;
                        confidenceLevel.textContent = `${Math.round(result.confidence * 100)}%`;
                        faceStatus.textContent = 'Face detected';
                        
                        // Automatically load songs for detected emotion
                        loadSongs(result.emotion.toLowerCase());
                        
                        // Display songs list in sidebar
                        displaySongsList(result.emotion.toLowerCase());
                    } else {
                        detectedEmotion.textContent = 'No face detected';
                        confidenceLevel.textContent = '0%';
                        faceStatus.textContent = result.message || 'Processing...';
                    }
                } catch (error) {
                    console.error('Error detecting emotion:', error);
                    faceStatus.textContent = 'Detection error';
                }
            }, 'image/jpeg');
        } catch (error) {
            console.error('Error capturing image:', error);
            faceStatus.textContent = 'Capture error';
        }
    }
    
    // Load songs for selected emotion
    function loadSongs(emotion) {
        fetch(`/get_songs/${emotion}`)
            .then(response => response.json())
            .then(data => {
                if (data.songs && data.songs.length > 0) {
                    const randomSong = data.songs[Math.floor(Math.random() * data.songs.length)];
                    // Removed currentSong since it was removed from HTML
                    
                    // Increment songs played counter
                    let currentCount = parseInt(songsPlayedValue.textContent) || 0;
                    songsPlayedValue.textContent = currentCount + 1;
                    
                    showNotification(`Now playing music for ${emotion}`, 'success');
                } else {
                    showNotification(`No songs found for ${emotion}`, 'warning');
                }
            })
            .catch(error => {
                console.error('Error loading songs:', error);
                // Silently continue - don't show error notification
            });
    }
    
    // Display songs list in sidebar
    function displaySongsList(emotion) {
        const songsContainer = document.getElementById('songsContainer');
        
        if (!songsContainer) {
            console.error('songsContainer element not found');
            return;
        }
        
        console.log('Loading songs for emotion:', emotion);
        
        fetch(`/get_songs/${emotion}`)
            .then(response => {
                console.log('Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Songs data received:', data);
                if (data.songs && data.songs.length > 0) {
                    currentPlaylist = data.songs;
                    currentSongIndex = -1;
                    
                    let html = '<div class="list-group">';
                    
                    data.songs.forEach((song, index) => {
                        const fileName = song.split('\\').pop().split('/').pop();
                        html += `
                            <a href="#" class="list-group-item list-group-item-action song-item" data-index="${index}">
                                <div class="d-flex w-100 justify-content-between">
                                    <h6 class="mb-1">${fileName}</h6>
                                    <small>${index + 1}</small>
                                </div>
                                <small class="text-muted">${song}</small>
                            </a>
                        `;
                    });
                    
                    html += '</div>';
                    songsContainer.innerHTML = html;
                    
                    // Add click event listeners to song items
                    document.querySelectorAll('.song-item').forEach(item => {
                        item.addEventListener('click', function(e) {
                            e.preventDefault();
                            const index = parseInt(this.getAttribute('data-index'));
                            playSong(index);
                        });
                    });
                } else {
                    console.warn('No songs found for emotion:', emotion);
                    songsContainer.innerHTML = `<p class="text-muted text-center">Loading songs for ${emotion}...</p>`;
                    currentPlaylist = [];
                    currentSongIndex = -1;
                }
            })
            .catch(error => {
                console.error('Error loading songs list:', error);
                // Silently fail - don't show error message to user
                songsContainer.innerHTML = `<p class="text-muted text-center">Loading songs...</p>`;
            });
    }
    
    // Function to show notifications
    function showNotification(message, type) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(note => note.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'success'} alert-dismissible fade show position-fixed notification`;
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification)
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    // Music Player Functions
    function playSong(index) {
        if (index < 0 || index >= currentPlaylist.length) return;
        
        currentSongIndex = index;
        const songPath = currentPlaylist[index];
        const fileName = songPath.split('\\').pop().split('/').pop();
        
        // Highlight current song
        document.querySelectorAll('.song-item').forEach((item, i) => {
            if (i === index) {
                item.classList.add('active');
                item.classList.add('list-group-item-primary');
            } else {
                item.classList.remove('active');
                item.classList.remove('list-group-item-primary');
            }
        });
        
        // Update UI
        nowPlaying.textContent = fileName;
        currentSongPath.textContent = songPath;
        
        // Set audio source and play
        // Use the full path relative to songs directory
        const relativePath = songPath.replace(/^.*[\\\/]/, '');
        const emotionFolder = songPath.split('/')[1] || songPath.split('\\')[1];
        audioPlayer.src = `/songs/${emotionFolder}/${encodeURIComponent(relativePath)}`;
        
        audioPlayer.play()
            .then(() => {
                isPlaying = true;
                playBtn.style.display = 'none';
                pauseBtn.style.display = 'inline-block';
                showNotification(`Now playing: ${fileName}`, 'success');
            })
            .catch(error => {
                console.error('Error playing song:', error);
                showNotification(`Error playing song: ${error.message}`, 'error');
            });
    }
    
    function togglePlayPause() {
        if (currentSongIndex === -1) return;
        
        if (isPlaying) {
            audioPlayer.pause();
            isPlaying = false;
            playBtn.style.display = 'inline-block';
            pauseBtn.style.display = 'none';
        } else {
            audioPlayer.play()
                .then(() => {
                    isPlaying = true;
                    playBtn.style.display = 'none';
                    pauseBtn.style.display = 'inline-block';
                })
                .catch(error => {
                    console.error('Error resuming playback:', error);
                    showNotification(`Error: ${error.message}`, 'error');
                });
        }
    }
    
    function stopPlayback() {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        isPlaying = false;
        playBtn.style.display = 'inline-block';
        pauseBtn.style.display = 'none';
        nowPlaying.textContent = 'No song selected';
        currentSongPath.textContent = '';
        progressBar.style.width = '0%';
        currentTimeEl.textContent = '0:00';
        durationEl.textContent = '0:00';
    }
    
    function playPrevious() {
        if (currentPlaylist.length === 0) return;
        let newIndex = currentSongIndex - 1;
        if (newIndex < 0) newIndex = currentPlaylist.length - 1;
        playSong(newIndex);
    }
    
    function playNext() {
        if (currentPlaylist.length === 0) return;
        let newIndex = currentSongIndex + 1;
        if (newIndex >= currentPlaylist.length) newIndex = 0;
        playSong(newIndex);
    }
    
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Event Listeners for Music Controls
    playBtn.addEventListener('click', togglePlayPause);
    pauseBtn.addEventListener('click', togglePlayPause);
    stopBtn.addEventListener('click', stopPlayback);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    
    // Audio Player Events
    audioPlayer.addEventListener('timeupdate', function() {
        if (audioPlayer.duration) {
            const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressBar.style.width = `${percent}%`;
            currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        }
    });
    
    audioPlayer.addEventListener('loadedmetadata', function() {
        durationEl.textContent = formatTime(audioPlayer.duration);
    });
    
    audioPlayer.addEventListener('ended', function() {
        playNext();
    });
    
    audioPlayer.addEventListener('error', function(e) {
        console.error('Audio playback error:', e);
        showNotification('Error playing audio file', 'error');
        isPlaying = false;
        playBtn.style.display = 'inline-block';
        pauseBtn.style.display = 'none';
    });
    
    // Initial setup
    updateModelStatus();
});

// Admin panel JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Handle upload form submission
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(uploadForm);
            const submitBtn = uploadForm.querySelector('button[type="submit"]');
            
            // Show loading state
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            submitBtn.disabled = true;

            fetch('/upload_song', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                showMessage(data.status === 'success' ? 'Success' : 'Error', data.message);
                if (data.status === 'success') {
                    uploadForm.reset();
                }
                // Reset button
                submitBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Song';
                submitBtn.disabled = false;
            })
            .catch(error => {
                console.error('Error uploading song:', error);
                showMessage('Error', 'Failed to upload song');
                submitBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Song';
                submitBtn.disabled = false;
            });
        });
    }

    // Handle mapping form submission
    const mappingForm = document.getElementById('mappingForm');
    if (mappingForm) {
        mappingForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const submitBtn = mappingForm.querySelector('button[type="submit"]');
            
            // Show loading state
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;

            const formData = new FormData(mappingForm);
            const mapping = {};

            for (let [key, value] of formData.entries()) {
                mapping[key] = value;
            }

            fetch('/update_mapping', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({mapping: mapping})
            })
            .then(response => response.json())
            .then(data => {
                showMessage(data.status === 'success' ? 'Success' : 'Error', data.message);
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Mapping';
                submitBtn.disabled = false;
            })
            .catch(error => {
                console.error('Error updating mapping:', error);
                showMessage('Error', 'Failed to update mapping');
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Mapping';
                submitBtn.disabled = false;
            });
        });
    }

    // Filter emotion selection for manage tab
    const filterEmotion = document.getElementById('filterEmotion');
    if (filterEmotion) {
        filterEmotion.addEventListener('change', function() {
            loadSongsForEmotion(this.value);
        });

        // Load songs for the first emotion if available
        if (filterEmotion.value) {
            loadSongsForEmotion(filterEmotion.value);
        }
    }

    // Load songs for selected emotion
    window.loadSongsForEmotion = function(emotion) {
        const songsContainer = document.getElementById('songsList');
        
        if (!emotion) {
            songsContainer.innerHTML = '<p class="text-center text-muted">Select an emotion to load songs</p>';
            return;
        }

        // Show loading state
        songsContainer.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading songs...</div>';

        fetch(`/get_songs/${emotion}`)
            .then(response => response.json())
            .then(data => {
                if (data.songs && data.songs.length > 0) {
                    let html = '<div class="row">';

                    data.songs.forEach((song, index) => {
                        const fileName = song.split('\\').pop().split('/').pop();
                        html += `
                            <div class="col-md-6 col-lg-4 mb-3">
                                <div class="card h-100">
                                    <div class="card-body">
                                        <h6 class="card-title" title="${fileName}">${truncateString(fileName, 25)}</h6>
                                        <small class="text-muted">${song}</small>
                                    </div>
                                    <div class="card-footer">
                                        <button class="btn btn-danger btn-sm w-100" onclick="deleteSong('${song}', '${fileName}')">
                                            <i class="fas fa-trash"></i> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    });

                    html += '</div>';
                    songsContainer.innerHTML = html;
                } else {
                    songsContainer.innerHTML = `<p class="text-center text-muted">No songs found for ${emotion} emotion</p>`;
                }
            })
            .catch(error => {
                console.error('Error loading songs:', error);
                songsContainer.innerHTML = '<p class="text-center text-muted">Loading songs...</p>';
            });
    };

    // Delete song function
    window.deleteSong = function(songPath, fileName) {
        if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
            fetch('/delete_song', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({song_path: songPath})
            })
            .then(response => response.json())
            .then(data => {
                showMessage(data.status === 'success' ? 'Success' : 'Error', data.message);
                if (data.status === 'success') {
                    // Reload the current emotion's songs
                    const currentEmotion = document.getElementById('filterEmotion').value;
                    loadSongsForEmotion(currentEmotion);
                }
            })
            .catch(error => {
                console.error('Error deleting song:', error);
                showMessage('Error', 'Failed to delete song');
            });
        }
    };

    // Refresh logs
    const refreshLogsBtn = document.getElementById('refreshLogs');
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', function() {
            location.reload();
        });
    }

    // Show message modal
    window.showMessage = function(title, message) {
        document.getElementById('messageModalTitle').textContent = title;
        document.getElementById('messageModalBody').textContent = message;
        const modal = new bootstrap.Modal(document.getElementById('messageModal'));
        modal.show();
    };

    // Helper function to truncate string
    function truncateString(str, maxLength) {
        if (str.length <= maxLength) return str;
        return str.substr(0, maxLength) + '...';
    }
});