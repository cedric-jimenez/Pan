import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const ORIGINAL_ENV = { ...process.env }

async function loadLogger() {
  vi.resetModules()
  const mod = await import("@/lib/logger")
  return mod.logger
}

describe("logger", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    process.env = { ...ORIGINAL_ENV }
  })

  it("logs everything up to LOG_LEVEL when logging is enabled", async () => {
    process.env.ENABLE_LOGGING = "true"
    process.env.LOG_LEVEL = "debug"
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})

    const logger = await loadLogger()
    logger.log("a")
    logger.warn("b")
    logger.info("c")
    logger.debug("d")

    expect(logSpy).toHaveBeenCalledWith("a")
    expect(warnSpy).toHaveBeenCalledWith("b")
    expect(infoSpy).toHaveBeenCalledWith("c")
    expect(debugSpy).toHaveBeenCalledWith("d")
  })

  it("suppresses debug/info logs when LOG_LEVEL is 'warn'", async () => {
    process.env.ENABLE_LOGGING = "true"
    process.env.LOG_LEVEL = "warn"
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})

    const logger = await loadLogger()
    logger.log("a")
    logger.warn("b")
    logger.info("c")
    logger.debug("d")

    expect(logSpy).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith("b")
    expect(infoSpy).not.toHaveBeenCalled()
    expect(debugSpy).not.toHaveBeenCalled()
  })

  it("falls back to 'info' level for an unrecognized LOG_LEVEL", async () => {
    process.env.ENABLE_LOGGING = "true"
    process.env.LOG_LEVEL = "not-a-level"
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})

    const logger = await loadLogger()
    logger.info("c")
    logger.debug("d")

    expect(infoSpy).toHaveBeenCalledWith("c")
    expect(debugSpy).not.toHaveBeenCalled()
  })

  it("suppresses everything except errors when logging is disabled", async () => {
    delete process.env.ENABLE_LOGGING
    vi.stubEnv("NODE_ENV", "production")
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const logger = await loadLogger()
    logger.log("a")
    logger.warn("b")
    logger.info("c")
    logger.debug("d")
    logger.error("secret stack trace")

    expect(logSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
    expect(infoSpy).not.toHaveBeenCalled()
    expect(debugSpy).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith("An error occurred. Check monitoring for details.")
    expect(errorSpy).not.toHaveBeenCalledWith("secret stack trace")
  })

  it("logs full error details when logging is enabled", async () => {
    process.env.ENABLE_LOGGING = "true"
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const logger = await loadLogger()
    logger.error("boom", { detail: 1 })

    expect(errorSpy).toHaveBeenCalledWith("boom", { detail: 1 })
  })

  it("enables logging automatically in development even without ENABLE_LOGGING", async () => {
    delete process.env.ENABLE_LOGGING
    vi.stubEnv("NODE_ENV", "development")
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    const logger = await loadLogger()
    logger.log("dev log")

    expect(logSpy).toHaveBeenCalledWith("dev log")
  })
})
