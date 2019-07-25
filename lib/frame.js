function setupIFrame(url) {
  const iFrameContainer = createIframe(url);
  const body = document.getElementsByTagName("BODY")[0];
  body.appendChild(iFrameContainer);
}

function createIframe(url) {
  const iFrameContainer = document.createElement('div');
  iFrameContainer.setAttribute("id", 'authFrameContainer');
  iFrameContainer.style.display = "none";

  const iFrameElement = document.createElement('iframe');
  iFrameElement.setAttribute("src", url);
  iFrameElement.setAttribute("id", 'authFrame');
  iFrameElement.style.width = "40rem";
  iFrameElement.style.height = "20rem";

  iFrameContainer.appendChild(iFrameElement);
  return iFrameContainer;
}

function removeIframe() {
  const frame = document.getElementById('#authFrameContainer');

  if (frame) {
    frame.parentNode.removeChild(frame);
  }
}

module.exports.setupIFrame = setupIFrame;
