/**
 * Учётная запись владельца для e2e.
 *
 * Вынесена в отдельный модуль, потому что playwright запрещает импортировать
 * один файл тестов из другого — а нужны эти значения и проекту setup,
 * и проверкам экрана входа.
 */
export const OWNER_NAME = 'Владелец Устройства';
export const OWNER_EMAIL = 'owner@example.com';
export const OWNER_PASSWORD = 'e2e-owner-password';
