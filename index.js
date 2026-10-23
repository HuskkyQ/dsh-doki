/**
 * Host half.
 *
 * The typing statistics live entirely in the browser: they read the composer's
 * own input state and render inside `conversation.composer.dock`. Nothing here
 * needs a host service, so `apply` stays empty on purpose — a host half with no
 * work is the safest shape for a client-only decoration.
 */
export function apply() {}
