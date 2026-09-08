import html2canvas from "html2canvas";

export const renderIDCardCanvas = async (cardElement) => {
  if (!cardElement) {
    return null;
  }

  return html2canvas(cardElement, {
    backgroundColor: "#ffffff",
    scale: Math.max(window.devicePixelRatio || 1, 3),
    useCORS: true,
  });
};

export const downloadIDCard = async (
  cardElement,
  fileName = "trainer-id-card.png",
) => {
  const canvas = await renderIDCardCanvas(cardElement);
  if (!canvas) {
    return null;
  }

  const image = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = image;
  link.download = fileName;
  link.click();
  return image;
};
