let source: AudioBufferSourceNode | undefined;

const stopMp3 = (): void => {
  if (source) {
    source.stop();
  }
};

const openMp3 = (file: string): void => {
  if (source) {
    source.stop();
  }
  const context = new AudioContext();
  source = context.createBufferSource();
  source.connect(context.destination);

  const token = localStorage.getItem('jwt');
  const headers = new Headers();
  headers.append('Authorization', 'Bearer ' + token);
  headers.append('Content-Type', 'application/json');

  window
    .fetch(file, { headers })
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => context.decodeAudioData(arrayBuffer))
    .then((audioBuffer) => {
      source!.buffer = audioBuffer;
      source!.start();
    });
};

export { openMp3, stopMp3 };
