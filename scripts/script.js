/* КОНФИГ */
const preloaderWaitindTime = 1200;
const cardsOnPage = 5;
const BASE_URL = 'https://v-content.practicum-team.ru';
const endpoint = `${BASE_URL}/api/videos?pagination[pageSize]=${cardsOnPage}&`;

/* ЭЛЕМЕНТЫ СТРАНИЦЫ */
const cardsList = document.querySelector('.content__list');
const cardsContainer = document.querySelector('.content__list-container');
const videoContainer = document.querySelector('.result__video-container');
const videoElement = document.querySelector('.result__video');
const form = document.querySelector('form');

/* ТЕМПЛЕЙТЫ */
const cardTmp = document.querySelector('.cards-list-item-template');
const preloaderTmp = document.querySelector('.preloader-template');
const videoNotFoundTmp = document.querySelector('.error-template');
const moreButtonTmp = document.querySelector('.more-button-template');

/* МЕХАНИКА */
let cardsOnPageState = [];

/* Первая загрузка */
showPreloader(preloaderTmp, videoContainer);
showPreloader(preloaderTmp, cardsContainer);
mainMechanics(endpoint);

/* Поиск */
form.onsubmit = (e) => {
  e.preventDefault();

  cardsList.textContent = '';

  const buttonInDOM = cardsContainer.querySelector('.more-button');
  if (buttonInDOM) {
    buttonInDOM.remove();
  }

  [...videoContainer.children].forEach((el) => {
    if (el.className === 'error') {
      el.remove();
    }
  });

  showPreloader(preloaderTmp, videoContainer);
  showPreloader(preloaderTmp, cardsContainer);

  const formData = serializeFormData(form);
  const requestUrl = generateFilterRequest(
    endpoint,
    formData.city,
    formData.timeArray
  );

  mainMechanics(requestUrl);
};

/* Основная механика */
async function mainMechanics(requestEndpoint) {
  try {
    const response = await fetch(requestEndpoint);

    if (!response.ok) {
      throw new Error('request-error');
    }

    const data = await response.json();
    cardsOnPageState = data.results;

    if (!data?.results?.[0]) {
      throw new Error('not-found');
    }

    appendCards({
      baseUrl: BASE_URL,
      dataArray: data.results,
      cardTmp,
      container: cardsList,
    });

    setVideo({
      baseUrl: BASE_URL,
      video: videoElement,
      videoUrl: data.results[0].video.url,
      posterUrl: data.results[0].poster.url,
    });

    const firstCard = document.querySelector('.content__card-link');
    if (firstCard) {
      firstCard.classList.add('content__card-link_current');
    }

    await waitForReadyVideo(videoElement);
    await delay(preloaderWaitindTime);

    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsContainer, '.preloader');

    cardsContainer.classList.add('custom-scrollbar');

    chooseCurrentVideo({
      baseUrl: BASE_URL,
      videoData: cardsOnPageState,
      cardLinksSelector: '.content__card-link',
      currentLinkClassName: 'content__card-link_current',
      mainVideo: videoElement,
    });

    showMoreCards({
      dataArray: data,
      buttonTemplate: moreButtonTmp,
      cardsList,
      buttonSelector: '.more-button',
      initialEndpoint: requestEndpoint,
      baseUrl: BASE_URL,
      cardTmp,
    });
  } catch (err) {
    if (err.message === 'not-found') {
      showError(videoContainer, videoNotFoundTmp, 'Нет подходящих видео =(');
    } else {
      showError(videoContainer, videoNotFoundTmp, 'Ошибка получения данных :(');
    }

    console.error(err);

    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsContainer, '.preloader');
  }
}

/* УТИЛИТЫ */

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReadyVideo(video) {
  return new Promise((resolve) => {
    if (video.readyState >= 4) {
      resolve();
      return;
    }

    video.oncanplaythrough = resolve;
  });
}

function showPreloader(tmp, parent) {
  const node = tmp.content.cloneNode(true);
  parent.append(node);
}

function removePreloader(parent, preloaderSelector) {
  const preloader = parent.querySelector(preloaderSelector);

  if (preloader) {
    preloader.remove();
  }
}

function appendCards({ baseUrl, dataArray, cardTmp, container }) {
  dataArray.forEach((el) => {
    const node = cardTmp.content.cloneNode(true);

    node.querySelector('a').setAttribute('id', el.id);
    node.querySelector('.content__video-card-title').textContent = el.city;
    node.querySelector('.content__video-card-description').textContent =
      el.description;

    node
      .querySelector('.content__video-card-thumbnail')
      .setAttribute('src', `${baseUrl}${el.thumbnail.url}`);

    node
      .querySelector('.content__video-card-thumbnail')
      .setAttribute('alt', el.description);

    container.append(node);
  });
}

function setVideo({ baseUrl, video, videoUrl, posterUrl }) {
  video.setAttribute('src', `${baseUrl}${videoUrl}`);
  video.setAttribute('poster', `${baseUrl}${posterUrl}`);
}

function serializeFormData(form) {
  const city = form.querySelector('input[name="city"]');
  const checkboxes = form.querySelectorAll('input[name="time"]');

  const checkedValuesArray = [...checkboxes].reduce((acc, item) => {
    if (item.checked) {
      acc.push(item.value);
    }

    return acc;
  }, []);

  return {
    city: city.value.trim(),
    timeArray: checkedValuesArray,
  };
}

function generateFilterRequest(baseEndpoint, city, timeArray) {
  const params = new URLSearchParams();

  if (city) {
    params.set('filters[city][$containsi]', city);
  }

  if (timeArray.length) {
    timeArray.forEach((timeslot) => {
      params.append('filters[time_of_day][$eqi]', timeslot);
    });
  }

  return `${baseEndpoint}${params.toString()}&`;
}

function chooseCurrentVideo({
  baseUrl,
  videoData,
  cardLinksSelector,
  currentLinkClassName,
  mainVideo,
}) {
  const cards = document.querySelectorAll(cardLinksSelector);

  cards.forEach((item) => {
    item.onclick = async (e) => {
      e.preventDefault();

      cards.forEach((card) => {
        card.classList.remove(currentLinkClassName);
      });

      item.classList.add(currentLinkClassName);
      showPreloader(preloaderTmp, videoContainer);

      const videoObj = videoData.find(
        (video) => String(video.id) === String(item.id)
      );

      if (!videoObj) {
        removePreloader(videoContainer, '.preloader');
        return;
      }

      setVideo({
        baseUrl,
        video: mainVideo,
        videoUrl: videoObj.video.url,
        posterUrl: videoObj.poster.url,
      });

      await waitForReadyVideo(mainVideo);
      await delay(preloaderWaitindTime);

      removePreloader(videoContainer, '.preloader');
    };
  });
}

function showError(container, errorTemplate, errorMessage) {
  const node = errorTemplate.content.cloneNode(true);
  node.querySelector('.error__title').textContent = errorMessage;
  container.append(node);
}

function showMoreCards({
  dataArray,
  buttonTemplate,
  cardsList,
  buttonSelector,
  initialEndpoint,
  baseUrl,
  cardTmp,
}) {
  if (dataArray.pagination.page === dataArray.pagination.pageCount) {
    return;
  }

  const button = buttonTemplate.content.cloneNode(true);
  cardsContainer.append(button);

  const buttonInDOM = cardsContainer.querySelector(buttonSelector);

  buttonInDOM.addEventListener('click', async () => {
    const currentPage = dataArray.pagination.page;
    const urlToFetch = `${initialEndpoint}pagination[page]=${currentPage + 1}&`;

    try {
      const response = await fetch(urlToFetch);

      if (!response.ok) {
        throw new Error('request-error');
      }

      const data = await response.json();

      buttonInDOM.remove();
      cardsOnPageState = cardsOnPageState.concat(data.results);

      appendCards({
        baseUrl,
        dataArray: data.results,
        cardTmp,
        container: cardsList,
      });

      chooseCurrentVideo({
        baseUrl: BASE_URL,
        videoData: cardsOnPageState,
        cardLinksSelector: '.content__card-link',
        currentLinkClassName: 'content__card-link_current',
        mainVideo: videoElement,
      });

      showMoreCards({
        dataArray: data,
        buttonTemplate,
        cardsList,
        buttonSelector,
        initialEndpoint,
        baseUrl,
        cardTmp,
      });
    } catch (err) {
      console.error(err);
    }
  });
}
