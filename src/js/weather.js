const API_KEY = "79365b1d2caff9a079b551800f8530e5";

function onGeoOK(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  const date = new Date();
  const year = date.getFullYear();
  console.log(date);
  console.log(year);

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`;
  const url2 = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=aUmeJGCOezrgkA4uhY5zkUGIrkDFJjI2BWn%2FCruID5RXEhCqmtHnL6ee4XHxjWA0Dw7Q8BJyBaPzRko3%2BGJikw%3D%3D&pageNo=1&numOfRows=1000&dataType=json&base_date=20221231&base_time=0600&nx=55&ny=127`;
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const weather = document.querySelector("#weather span:first-child");
      const city = document.querySelector("#weather span:last-child");
      city.innerText = data.name;
      weather.innerText = data.weather[0].main;
    });
}

function onGeoError() {}

navigator.geolocation.getCurrentPosition(onGeoOK, onGeoError);
