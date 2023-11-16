let source;

const stopMp3 = () => {
  if (source) {
    source.stop();
  }
};

const openMp3 = (file) => {
  if (source) {
    source.stop();
  }
  const context = new AudioContext();
  source = context.createBufferSource();
  source.connect(context.destination);

  // const playButton = document.querySelector('#play');
  const token = localStorage.getItem('jwt');
  let headers = new Headers();
  headers.append('Authorization', 'Bearer ' + token);
  headers.append('Content-Type', 'application/json');

  window
    .fetch(file, { headers })
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => context.decodeAudioData(arrayBuffer))
    .then((audioBuffer) => {
      source.buffer = audioBuffer;
      source.start();
    });
};

export { openMp3, stopMp3 };
