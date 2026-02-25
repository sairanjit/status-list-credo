
import { AskarModule } from "@credo-ts/askar";
import {
  Agent,
  ConsoleLogger,
  LogLevel,
} from "@credo-ts/core";
import { agentDependencies } from "@credo-ts/node";
import { askar } from "@openwallet-foundation/askar-nodejs";

export const holder = new Agent({
  config: {
    logger: new ConsoleLogger(LogLevel.trace),
  },
  modules: {
    askar: new AskarModule({
      askar,
      store: {
        id: "holder-agent-id-1",
        key: "holder-agent-key",
      }
    }),
  },
  dependencies: agentDependencies,
});

export const issuer = new Agent({
  config: {
    logger: new ConsoleLogger(LogLevel.trace),
  },
  modules: {
    askar: new AskarModule({
      askar,
      store: {
        id: "issuer-agent-id-1",
        key: "issuer-agent-key",
      }
    }),
  },
  dependencies: agentDependencies,
});

export const verifier = new Agent({
  config: {
    logger: new ConsoleLogger(LogLevel.trace),
  },
  modules: {
    askar: new AskarModule({
      askar,
      store: {
        id: "verifier-agent-id-1",
        key: "verifier-agent-key",
      }
    }),
  },
  dependencies: agentDependencies,
});