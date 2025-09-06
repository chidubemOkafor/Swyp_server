export const generateMeetingId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const getRandomGroup = (length: number) =>
        Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    return `${getRandomGroup(3)}-${getRandomGroup(4)}-${getRandomGroup(3)}`;
}
