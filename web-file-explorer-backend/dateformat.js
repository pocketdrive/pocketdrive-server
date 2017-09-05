function pad(number) {
    if (number < 10) {
        return '0' + number;
    }
    return number;
}

export function dateToString(date) {
    return date.getUTCFullYear() +
        '-' + pad(date.getUTCMonth() + 1) +
        '-' + pad(date.getUTCDate()) +
        ' ' + pad(date.getUTCHours()) +
        ':' + pad(date.getUTCMinutes()) +
        ':' + pad(date.getUTCSeconds());
}
