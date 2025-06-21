document.addEventListener('DOMContentLoaded', function() {
    const hamburgerButton = document.getElementById('hamburger-button');
    const navLinks = document.getElementById('nav-links');

    if (hamburgerButton && navLinks) {
        hamburgerButton.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            // NOWA LINIA: Dodaje/usuwa klasę 'menu-open' na elemencie body
            document.body.classList.toggle('menu-open');
        });
    }

    // --- LOGIKA PRZYCISKU INSTALACJI PWA ---
    let deferredPrompt;
    const installButton = document.getElementById('installButton');

    // Zdarzenie beforeinstallprompt jest wywoływane, gdy przeglądarka jest gotowa do instalacji PWA.
    window.addEventListener('beforeinstallprompt', (e) => {
      // Zapobiegaj wyświetlaniu domyślnego monitu przeglądarki
      e.preventDefault();
      // Zapisz zdarzenie, aby móc je wywołać później
      deferredPrompt = e;
      // Pokaż przycisk instalacji, jeśli istnieje i był ukryty
      if (installButton) {
        installButton.style.display = 'block';
      }
      console.log('beforeinstallprompt event fired.');
    });

    // Obsługa kliknięcia przycisku instalacji
    if (installButton) {
      installButton.addEventListener('click', async () => {
        // Ukryj przycisk po kliknięciu
        installButton.style.display = 'none';
        
        // Pokaż monit instalacji (jeśli zdarzenie zostało przechwycone)
        if (deferredPrompt) {
          deferredPrompt.prompt();
          // Poczekaj na odpowiedź użytkownika na monit
          const { outcome } = await deferredPrompt.userChoice;
          // Zresetuj deferredPrompt po użyciu
          deferredPrompt = null; // Można instalować tylko raz na sesję przeglądania
          
          console.log(`Użytkownik ${outcome === 'accepted' ? 'zaakceptował' : 'odrzucił'} instalację PWA.`);
        }
      });
    }

    // Opcjonalnie: Nasłuchuj zdarzenia appinstalled, aby wiedzieć, kiedy aplikacja została zainstalowana.
    window.addEventListener('appinstalled', () => {
      console.log('PWA została pomyślnie zainstalowana!');
      // Możesz tutaj wykonać jakieś akcje, np. ukryć przycisk na stałe
      if (installButton) {
        installButton.style.display = 'none';
      }
    });
    // --- KONIEC LOGIKI PRZYCISKU INSTALACJI PWA ---
});