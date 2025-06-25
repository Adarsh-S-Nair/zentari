// Color utility functions for accessing CSS custom properties

/**
 * Get a CSS custom property value
 * @param {string} property - The CSS custom property name (e.g., '--color-primary')
 * @returns {string} The computed value
 */
export function getCSSVariable(property) {
  return getComputedStyle(document.documentElement).getPropertyValue(property).trim();
}

/**
 * Get color values from CSS custom properties
 * @returns {Object} Object containing all color values
 */
export function getColors() {
  return {
    // Primary Colors
    primary: getCSSVariable('--color-primary'),
    primaryLight: getCSSVariable('--color-primary-light'),
    primaryDark: getCSSVariable('--color-primary-dark'),
    primaryHover: getCSSVariable('--color-primary-hover'),

    // Success Colors
    success: getCSSVariable('--color-success'),
    successLight: getCSSVariable('--color-success-light'),
    successBg: getCSSVariable('--color-success-bg'),
    successBorder: getCSSVariable('--color-success-border'),

    // Danger Colors
    danger: getCSSVariable('--color-danger'),
    dangerLight: getCSSVariable('--color-danger-light'),
    dangerBg: getCSSVariable('--color-danger-bg'),
    dangerBorder: getCSSVariable('--color-danger-border'),

    // Warning Colors
    warning: getCSSVariable('--color-warning'),
    warningLight: getCSSVariable('--color-warning-light'),
    warningBg: getCSSVariable('--color-warning-bg'),
    warningBorder: getCSSVariable('--color-warning-border'),

    // Info Colors
    info: getCSSVariable('--color-info'),
    infoLight: getCSSVariable('--color-info-light'),
    infoBg: getCSSVariable('--color-info-bg'),
    infoBorder: getCSSVariable('--color-info-border'),

    // Neutral Colors
    white: getCSSVariable('--color-white'),
    black: getCSSVariable('--color-black'),

    // Gray Scale
    gray50: getCSSVariable('--color-gray-50'),
    gray100: getCSSVariable('--color-gray-100'),
    gray200: getCSSVariable('--color-gray-200'),
    gray300: getCSSVariable('--color-gray-300'),
    gray400: getCSSVariable('--color-gray-400'),
    gray500: getCSSVariable('--color-gray-500'),
    gray600: getCSSVariable('--color-gray-600'),
    gray700: getCSSVariable('--color-gray-700'),
    gray800: getCSSVariable('--color-gray-800'),
    gray900: getCSSVariable('--color-gray-900'),

    // Background Colors
    bgPrimary: getCSSVariable('--color-bg-primary'),
    bgSecondary: getCSSVariable('--color-bg-secondary'),
    bgTertiary: getCSSVariable('--color-bg-tertiary'),
    bgHover: getCSSVariable('--color-bg-hover'),
    bgDark: getCSSVariable('--color-bg-dark'),

    // Text Colors
    textPrimary: getCSSVariable('--color-text-primary'),
    textSecondary: getCSSVariable('--color-text-secondary'),
    textMuted: getCSSVariable('--color-text-muted'),
    textLight: getCSSVariable('--color-text-light'),
    textWhite: getCSSVariable('--color-text-white'),

    // Border Colors
    borderPrimary: getCSSVariable('--color-border-primary'),
    borderSecondary: getCSSVariable('--color-border-secondary'),
    borderDark: getCSSVariable('--color-border-dark'),

    // Shadow Colors
    shadowLight: getCSSVariable('--color-shadow-light'),
    shadowMedium: getCSSVariable('--color-shadow-medium'),
    shadowHeavy: getCSSVariable('--color-shadow-heavy'),

    // Chart Colors
    chartPrimary: getCSSVariable('--color-chart-primary'),
    chartSecondary: getCSSVariable('--color-chart-secondary'),
    chartBg: getCSSVariable('--color-chart-bg'),

    // Status Colors
    statusOpen: getCSSVariable('--color-status-open'),
    statusOpenBg: getCSSVariable('--color-status-open-bg'),
    statusClosed: getCSSVariable('--color-status-closed'),
    statusClosedBg: getCSSVariable('--color-status-closed-bg'),

    // Position Colors
    positionLong: getCSSVariable('--color-position-long'),
    positionLongBg: getCSSVariable('--color-position-long-bg'),
    positionShort: getCSSVariable('--color-position-short'),
    positionShortBg: getCSSVariable('--color-position-short-bg'),

    // Action Colors
    actionBuy: getCSSVariable('--color-action-buy'),
    actionBuyBg: getCSSVariable('--color-action-buy-bg'),
    actionSell: getCSSVariable('--color-action-sell'),
    actionSellBg: getCSSVariable('--color-action-sell-bg'),

    // Modal Colors
    modalBg: getCSSVariable('--color-modal-bg'),
    modalOverlay: getCSSVariable('--color-modal-overlay'),
    modalShadow: getCSSVariable('--color-modal-shadow'),

    // Sidebar Colors
    sidebarBg: getCSSVariable('--color-sidebar-bg'),
    sidebarHover: getCSSVariable('--color-sidebar-hover'),
    sidebarActive: getCSSVariable('--color-sidebar-active'),
    sidebarText: getCSSVariable('--color-sidebar-text'),
    sidebarTextMuted: getCSSVariable('--color-sidebar-text-muted'),

    // Form Colors
    inputBg: getCSSVariable('--color-input-bg'),
    inputBorder: getCSSVariable('--color-input-border'),
    inputFocus: getCSSVariable('--color-input-focus'),
    inputError: getCSSVariable('--color-input-error'),

    // Button Colors
    buttonPrimary: getCSSVariable('--color-button-primary'),
    buttonPrimaryHover: getCSSVariable('--color-button-primary-hover'),
    buttonSecondary: getCSSVariable('--color-button-secondary'),
    buttonSecondaryHover: getCSSVariable('--color-button-secondary-hover'),
    buttonDanger: getCSSVariable('--color-button-danger'),
    buttonDangerHover: getCSSVariable('--color-button-danger-hover'),
    buttonDisabled: getCSSVariable('--color-button-disabled'),
    buttonDisabledBg: getCSSVariable('--color-button-disabled-bg'),
  };
}

// Pre-computed colors object for better performance
export const colors = getColors(); 