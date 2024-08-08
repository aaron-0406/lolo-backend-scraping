function extractTextContent  (element: Element, label: string): string | null {
  const labelElement = Array.from(element.querySelectorAll('*')).find(el => el.textContent?.includes(label));
  if (labelElement) {
    const textContent = labelElement.textContent || '';
    const labelIndex = textContent.indexOf(label);
    if (labelIndex !== -1) {
      return textContent.substring(labelIndex + label.length).trim().split('\n')[0].trim();
    }
  }
  return null;
}
export default extractTextContent;