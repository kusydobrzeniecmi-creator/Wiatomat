WIATOMAT — WERSJA STARTOWA 0.1

CO ZAWIERA
- responsywny interfejs na telefon i komputer,
- model 3D wiaty z dachem jednospadowym,
- automatyczne rozmieszczenie dowolnej liczby rzędów i słupów,
- wybór elementu w modelu, przesuwanie i duplikowanie,
- pokazywanie/ukrywanie grup elementów,
- prosta animacja montażu,
- orientacyjne zestawienie drewna i pokrycia,
- zapis lokalny oraz eksport/import projektu JSON,
- eksport zestawienia CSV.

JAK URUCHOMIĆ I UDOSTĘPNIĆ
1. Rozpakuj ZIP.
2. Umieść zawartość folderu na hostingu obsługującym HTTPS i statyczne strony (np. GitHub Pages lub Netlify).
3. Otwórz otrzymany adres HTTPS na telefonie.
4. Android/Chrome: menu przeglądarki → „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.
5. Wyślij bratu ten sam adres HTTPS. Może zainstalować aplikację u siebie.
6. Projekty można przekazywać osobno przyciskiem „Eksport projektu” — brat wczyta plik przez „Wczytaj projekt”.

UWAGI TECHNICZNE
- Renderer 3D Three.js jest pobierany z CDN, więc pierwsze uruchomienie wymaga internetu.
- PWA wymaga HTTPS (lub localhost); otwarcie index.html bezpośrednio z pliku nie zapewnia instalacji PWA.
- Dane projektu są przechowywane lokalnie w przeglądarce; nie synchronizują się automatycznie między telefonami.
- To prototyp funkcjonalny, nie gotowy program do wykonywania projektu budowlanego.

WAŻNE — BEZPIECZEŃSTWO
Kosztorys jest orientacyjny. Aplikacja nie oblicza nośności, ugięć, stateczności, obciążeń śniegiem/wiatrem ani nośności połączeń. Nie traktuj proponowanych wymiarów jako potwierdzenia bezpieczeństwa. Konstrukcję należy zweryfikować z konstruktorem.
