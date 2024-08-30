import Elysia from "elysia";
import logixlysia from "logixlysia";

export const useLoggers: Elysia = logixlysia({
    config: {
        showBanner: true,
        ip: true,
        logFilePath: './logs/example.log',
        customLogFormat:
            '🦊 {now} {level} {duration} {method} {pathname} {status} {message} {ip} {epoch}',
        // logFilter: {
        //   level: ['ERROR', 'WARNING'],
        //   status: [500, 404],
        //   method: 'GET'
        // }
    }
}) 