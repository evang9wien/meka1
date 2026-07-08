const openPdf = (file: string): void => {
  const token = localStorage.getItem('jwt');
  if (token) {
    const headers = new Headers();
    headers.append('Authorization', 'Bearer ' + token);
    headers.append('Content-Type', 'application/json');
    fetch(file, { headers })
      .then(async (response) => ({
        filename: 'downloaded.pdf',
        blob: await response.blob(),
      }))
      .then((resObj) => {
        const pdfBlob = new Blob([resObj.blob], { type: 'application/pdf' });
        const objectUrl = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.target = '_blank';
        link.click();
        window.URL.revokeObjectURL(objectUrl);
      });
  }
};

export { openPdf };
