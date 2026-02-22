/**
 * Mock transkripsiyon — test ve geliştirme için.
 * Gerçek API çağrısı yapmaz, sabit metin döner.
 */
export async function transcribeMock(
  _filePath: string
): Promise<string> {
  return "Bu bir mock transkripsiyon mesajıdır. Gerçek Whisper API'yi etkinleştirmek için MOCK_TRANSCRIPTION=false yapın ve TRANSCRIPTION_API_KEY ayarlayın.";
}
