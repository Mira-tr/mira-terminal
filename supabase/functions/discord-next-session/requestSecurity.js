export const DISCORD_INTERACTION_MAX_AGE_SECONDS = 300;
export const DISCORD_INTERACTION_MAX_FUTURE_SKEW_SECONDS = 30;

export function isFreshDiscordTimestamp(
    timestamp,
    now = new Date(),
    {
        maxAgeSeconds = DISCORD_INTERACTION_MAX_AGE_SECONDS,
        maxFutureSkewSeconds = DISCORD_INTERACTION_MAX_FUTURE_SKEW_SECONDS
    } = {}
){
    const timestampSeconds = Number(timestamp);
    const nowMilliseconds = new Date(now).getTime();

    if(!Number.isInteger(timestampSeconds) || timestampSeconds <= 0 || !Number.isFinite(nowMilliseconds)){
        return false;
    }

    const nowSeconds = Math.floor(nowMilliseconds / 1000);
    const ageSeconds = nowSeconds - timestampSeconds;

    return ageSeconds <= Math.max(0, Number(maxAgeSeconds) || 0)
        && ageSeconds >= -Math.max(0, Number(maxFutureSkewSeconds) || 0);
}
