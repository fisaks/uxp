export function parseMqttTopic(topic: string, minSegments = 3): { edge: string; segments: string[] } | null {
    const segments = topic.split("/");
    if (segments.length < minSegments) return null;
    return { edge: segments[1], segments };
}
