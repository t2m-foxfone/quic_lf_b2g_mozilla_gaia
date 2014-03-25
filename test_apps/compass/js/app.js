window.addEventListener('load', function() {
    var compass = document.getElementById('compass'),
        size = (document.body.offsetWidth/100)*90;

    compass.style.width = compass.style.height = size + 'px';
    compass.style.visibility = 'visible';

    var directions = document.getElementsByClassName('direction');
    for (var i = 0, max = directions.length; i < max; i++) {
        directions[i].style.transform = 'rotateZ(' + (i * 45) + 'deg)';
    }

    var degrees = document.getElementsByClassName('degree');
    for (var i = 0, max = degrees.length; i < max; i++) {
        degrees[i].style.transform = 'rotateZ(' + (360 - (i * 30)) + 'deg)';
    }
});

var face = document.getElementById('face'),
    deg = document.getElementById('degrees');

if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', orientation, false);
} else {
    deg.innerHTML = '<p>Sorry, device not supported!</p>';
}

function orientation(event) {
    // compass direction facing in degrees
    var degree = Math.round(event.alpha);

    face.style.transform = 'rotate(' + degree + 'deg)';
    deg.innerHTML = degree + ' &deg;';
}

function install(ev) {
    ev.preventDefault();
    // define the manifest URL
    var manifest_url = "http://code.beardfu.com/firefox_os/compass/manifest.webapp";
    // install the app
    var installLocFind = navigator.mozApps.install(manifest_url);
    installLocFind.onsuccess = function(data) {
        // App is installed, do something
    };
    installLocFind.onerror = function() {
        // App wasn't installed, info is in
        // installapp.error.name
        alert(installapp.error.name);
    };
};

// get a reference to the button and call install() on click
var button = document.getElementById('install');

var installCheck = navigator.mozApps.checkInstalled("http://code.beardfu.com/firefox_os/compass/manifest.webapp");
// check whether the app defined in the above manifest file is installed
installCheck.onsuccess = function() {
    if(installCheck.result) {
        button.style.display = "none";
        // if it's already installed on the device, hide the install button, as we don't need it.
    } else {
        button.addEventListener('click', install, false);
        // if it isn't, run the install code contained in the install() function
    };
};
