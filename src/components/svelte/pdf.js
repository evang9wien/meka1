const openPdf = (file) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      let headers = new Headers();
      headers.append('Authorization', 'Bearer ' + token);
      headers.append('Content-Type', 'application/json');
      fetch(file, { headers })
        .then(async (response) => ({
          filename: 'downloaded.pdf',
          blob: await response.blob(),
        }))
        .then((resObj) => {
          const pdfBlob = new Blob([resObj.blob], { type: 'application/pdf' });
          let objectUrl = window.URL.createObjectURL(pdfBlob);
          let link = document.createElement('a');
          link.href = objectUrl;
          link.target = '_blank';
          link.click();
          window.URL.revokeObjectURL(objectUrl);
        });
    }
  };

export {openPdf}