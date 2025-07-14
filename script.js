document.addEventListener("DOMContentLoaded", () => {
        const locationEl = document.getElementById("location");
        const weatherEl = document.getElementById("weather");
        const networkEl = document.getElementById("network");
        const statusEl = document.getElementById("status");
        const statusMessageEl = document.getElementById("statusMessage");
        const lastCheckedEl = document.getElementById("lastChecked");
        const statusBarEl = document.getElementById("statusBar");
        const temperatureEl = document.getElementById("temperature");
        const humidityEl = document.getElementById("humidity");
        const safetyStatusCard = document.getElementById("safetyStatusCard");
        const refreshBtn = document.getElementById("refreshBtn");
        const canvas = document.getElementById("weatherCanvas");
        const ctx = canvas.getContext("2d");

        const OPENWEATHER_API = "38d29484f560cc993f0f4a24f6de8e1f";

        let lastUpdateTime = null;
        let currentWeatherData = null;

        refreshBtn.addEventListener("click", refreshData);

        async function getLocation() {
          showLoadingState();

          if (!navigator.geolocation) {
            updateLocationUI("Geolocation not supported in your browser");
            showErrorState();
            return;
          }

          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              });
            });

            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            await getWeather(lat, lon);
            getNetworkStatus();
            updateLastChecked();
          } catch (err) {
            console.error("Geolocation error:", err);
            updateLocationUI("Location access denied or error occurred");
            showErrorState();
            try {
              const ipLocation = await fetch("https://ipapi.co/json/");
              const data = await ipLocation.json();
              updateLocationUI(`${data.city}, ${data.country_name}`);
              await getWeather(data.latitude, data.longitude);
            } catch (ipErr) {
              console.error("IP location error:", ipErr);
              showErrorState();
            }
          }
        }

        async function getWeather(lat, lon) {
          try {
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API}&units=metric`;
            const res = await fetch(url);

            if (!res.ok) throw new Error(`API error: ${res.status}`);

            const data = await res.json();
            currentWeatherData = data;

            if (!data.weather || !data.weather[0] || !data.main) {
              throw new Error("Incomplete weather data");
            }

            const city = data.name || "Unknown location";
            const country = data.sys?.country || "";
            const description = data.weather[0].main;
            const temp = Math.round(data.main.temp);
            const humidity = data.main.humidity;
            const detailedDescription = data.weather[0].description;

            updateLocationUI(`${city}${country ? `, ${country}` : ""}`);
            weatherEl.textContent = `${detailedDescription}`;
            temperatureEl.textContent = `${temp}°C`;
            humidityEl.textContent = `${humidity}%`;

            drawWeather(description);
            updateSafetyStatus(description);

            lastUpdateTime = new Date();
          } catch (err) {
            console.error("Weather fetch error:", err);
            weatherEl.textContent = "Weather data unavailable";
            temperatureEl.textContent = "--°C";
            humidityEl.textContent = "--%";
            statusEl.textContent = "ERROR";
            statusMessageEl.innerHTML = `<i class="fas fa-exclamation-circle mr-2 text-red-500"></i>Unable to fetch current weather conditions`;
            updateSafetyStatusCard("error");
            showErrorState();
          }
        }

        function getNetworkStatus() {
          const connection =
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection;

          if (connection) {
            const type = connection.effectiveType.toUpperCase();
            const downlink = connection.downlink;
            let networkStatus = type;
            let icon = "fa-wifi";
            let color = "text-blue-600";

            if (downlink < 0.5) {
              networkStatus += " (Slow)";
              color = "text-yellow-600";
              icon = "fa-wifi-exclamation";
            } else if (downlink < 1) {
              networkStatus += " (Fair)";
              color = "text-yellow-600";
            }

            networkEl.innerHTML = `<span class="${color}"><i class="fas ${icon} mr-1"></i>${networkStatus}</span>`;

            if (downlink < 0.5) {
              updateSafetyStatus(
                "Network",
                "Poor network may affect emergency communications"
              );
            }
          } else {
            networkEl.innerHTML = `<i class="fas fa-question-circle mr-1 text-gray-500"></i>Unknown`;
          }
        }

        function drawWeather(condition) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.font = "40px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const conditionIcons = {
            Clear: "☀️",
            Clouds: "☁️",
            Rain: "🌧️",
            Thunderstorm: "⛈️",
            Drizzle: "🌦️",
            Snow: "❄️",
            Mist: "🌫️",
            Fog: "🌫️",
            Smoke: "💨",
            Haze: "🌫️",
            Dust: "💨",
            Sand: "💨",
            Ash: "🌋",
            Squall: "🌬️",
            Tornado: "🌪️",
          };

          const icon = conditionIcons[condition] || "🌡️";

          if (condition === "Clear") ctx.fillStyle = "#F59E0B";
          else if (
            condition === "Rain" ||
            condition === "Thunderstorm" ||
            condition === "Drizzle"
          )
            ctx.fillStyle = "#3B82F6";
          else if (condition === "Snow") ctx.fillStyle = "#BFDBFE";
          else if (condition === "Tornado") ctx.fillStyle = "#EF4444";
          else ctx.fillStyle = "#6B7280";

          ctx.fillText(icon, canvas.width / 2, canvas.height / 2);
        }

        function updateSafetyStatus(condition, customMessage) {
          const safetyLevels = {
            Clear: {
              level: "SAFE",
              color: "from-green-100 to-green-50",
              border: "border-green-500",
              icon: "fa-check-circle",
              iconColor: "text-green-600",
              btnColor: "bg-green-600 hover:bg-green-700",
            },
            Clouds: {
              level: "MODERATE",
              color: "from-yellow-100 to-yellow-50",
              border: "border-yellow-500",
              icon: "fa-cloud",
              iconColor: "text-yellow-600",
              btnColor: "bg-yellow-600 hover:bg-yellow-700",
            },
            Rain: {
              level: "CAUTION",
              color: "from-orange-100 to-orange-50",
              border: "border-orange-500",
              icon: "fa-umbrella",
              iconColor: "text-orange-600",
              btnColor: "bg-orange-600 hover:bg-orange-700",
            },
            Thunderstorm: {
              level: "WARNING",
              color: "from-red-100 to-red-50",
              border: "border-red-500",
              icon: "fa-bolt",
              iconColor: "text-red-600",
              btnColor: "bg-red-600 hover:bg-red-700",
            },
            Extreme: {
              level: "DANGER",
              color: "from-red-200 to-red-100",
              border: "border-red-600",
              icon: "fa-triangle-exclamation",
              iconColor: "text-red-700",
              btnColor: "bg-red-700 hover:bg-red-800",
            },
            Tornado: {
              level: "DANGER",
              color: "from-red-200 to-red-100",
              border: "border-red-600",
              icon: "fa-tornado",
              iconColor: "text-red-700",
              btnColor: "bg-red-700 hover:bg-red-800",
            },
            Network: {
              level: "CAUTION",
              color: "from-yellow-100 to-yellow-50",
              border: "border-yellow-500",
              icon: "fa-wifi-exclamation",
              iconColor: "text-yellow-600",
              btnColor: "bg-yellow-600 hover:bg-yellow-700",
            },
            Error: {
              level: "UNKNOWN",
              color: "from-gray-100 to-gray-50",
              border: "border-gray-500",
              icon: "fa-question-circle",
              iconColor: "text-gray-600",
              btnColor: "bg-gray-600 hover:bg-gray-700",
            },
          };

          const messages = {
            Clear: "Conditions are safe. Enjoy your day!",
            Clouds: "Partly cloudy conditions. Generally safe.",
            Rain: "Rain expected. Carry an umbrella and be cautious on wet surfaces.",
            Thunderstorm: "Thunderstorm alert! Seek shelter if outdoors.",
            Extreme:
              "Extreme weather warning! Stay indoors and follow local advisories.",
            Tornado:
              "Tornado warning! Seek immediate shelter in a basement or interior room.",
            Network:
              customMessage ||
              "Network issues may affect emergency communications.",
            Error: "Unable to determine safety status. Please check manually.",
          };

          const status = safetyLevels[condition] || safetyLevels.Error;
          const message = messages[condition] || messages.Error;

          statusEl.innerHTML = `<i class="fas ${status.icon} mr-2 ${status.iconColor}"></i>${status.level}`;
          statusEl.className = `font-bold flex items-center justify-center ${status.iconColor}`;
          statusMessageEl.innerHTML = `<i class="fas ${status.icon} mr-2 ${status.iconColor}"></i>${message}`;
          safetyStatusCard.className = `safety-card bg-gradient-to-br ${status.color} p-4 rounded-xl shadow-md border-l-4 ${status.border}`;
        }

        function updateSafetyStatusCard(status) {
          updateSafetyStatus(status);
        }

        function updateLastChecked() {
          const now = new Date();
          const timeString = now.toLocaleTimeString();
          const dateString = now.toLocaleDateString();

          lastCheckedEl.textContent = `${dateString} ${timeString}`;
          statusBarEl.innerHTML = `
            <div class="flex items-center gap-2">
              <i class="fas fa-check-circle"></i>
              <span>Last updated: ${timeString}</span>
            </div>
            <div class="text-sm font-normal">${dateString}</div>
          `;
        }

        function updateLocationUI(text) {
          locationEl.textContent = text;
        }

        function showLoadingState() {
          statusBarEl.innerHTML = `
            <div class="flex items-center gap-2">
              <i class="fas fa-sync-alt fa-spin"></i>
              <span>Updating data...</span>
            </div>
          `;
        }

        function showErrorState() {
          statusBarEl.innerHTML = `
            <div class="flex items-center gap-2">
              <i class="fas fa-exclamation-triangle"></i>
              <span>Update failed</span>
            </div>
          `;
          statusBarEl.className =
            "bg-gradient-to-r from-red-500 to-red-600 p-3 text-white font-medium flex items-center justify-between";
        }

        function refreshData() {
          refreshBtn.innerHTML = `<i class="fas fa-sync-alt fa-spin mr-1"></i> Refreshing...`;
          getLocation();
          setTimeout(() => {
            refreshBtn.innerHTML = `<i class="fas fa-sync-alt mr-1"></i> Refresh Now`;
          }, 2000);
        }

        getLocation();

        setInterval(getLocation, 10 * 60 * 1000);
      });
