import { AppLogger, Route } from "@uxp/bff-common";
import { homeVideoService } from "../home-video/home-video.service";
import { movieService } from "../movie/movie.service";

export class LibraryController {
    /** Starts a scan of the media folders and answers at once. The status tells when it is done. */
    @Route("post", "/library/scan", { authenticate: true })
    async scan(): Promise<void> {
        Promise.all([homeVideoService.scan(), movieService.scan()]).catch((error) =>
            AppLogger.error(undefined, { message: "The library scan failed", error })
        );
    }
}
