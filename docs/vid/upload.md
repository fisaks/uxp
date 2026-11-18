# VID Upload from a phone

Home videos can be sent to the library from a phone (or any browser) on the Upload page, `/home-videos/upload`
(the Upload tile on the home page, or the Upload button on the home video list). Films and series are not
uploaded.

## What the user does

1. Press the button and choose videos with the system file picker (several at once). The picker is the filter,
   the page cannot list the gallery.
2. Optionally set the date of each video while it is still in the list. Empty means the server reads the
   date the phone recorded in the file.
3. Keep the screen on. The page asks the browser to keep it awake while sending (Screen Wake Lock); a locked screen
   still pauses the transfer, and the page then shows a resume button.
4. When a video is sent the server makes it ready and the row shows the queue position and then the percent.
   A finished video appears in the clip list at once.

## How it works

- The file is sent in 8 MB chunks with `PUT /uploads/:id?offset=N` (`application/octet-stream`). The server
  appends only at the offset it has, so a chunk that is repeated or out of order is refused with `CONFLICT` and the
  client continues from the offset in the answer. Failed chunks are retried 3 times (after 2, 5 and 10 s); a lost
  connection or a 5xx pauses the upload and the user resumes it. There is no WebSocket for the data, plain HTTP over the
  same name locally and on the public site.
- An open upload is `HomeVideos/_incoming/<id>.part` and `<id>.json` (owner, size, original name, date,
  fingerprint). The scanner ignores folders that start with `_`.
- The last chunk starts the processing. A clip that is H.264 with AAC (or without audio) is only remuxed
  (`-c copy +faststart`); anything else (phone HEVC) is converted to H.264 CRF 20 and AAC 160 kbit/s. Conversions run one at a time,
  the rest wait in a queue. Subtitles and extra video tracks are dropped.
- The result is `HomeVideos/uploads/<id>.mp4`. The path is chosen once and never changes, because the clip id is
  made from it. The date is not in the path, it is label data.
- The date of a clip is the one the user typed, else the recording time in the file (converted to the local time zone of the server,
  ignored when empty or from 1970), else none.
- The server pushes `upload_state` over the existing WebSocket to every logged-in user: queued, processing with percent, done
  (with the clip id) or failed (with an error code). The page also asks `GET /uploads` when it opens, so a reload or a second
  device shows the same list.

## Reload and other devices

- After a reload the browser has lost the files. The page lists the unfinished uploads of everyone as
  "Stopped at n %". Choose the same file again to continue: it is the same file when name, size and a fingerprint
  (SHA-1 of the first and last megabyte) match, otherwise a new upload is started.
- An upload written to in the last 15 s is shown as sent from another device or tab and cannot be resumed or removed.
- Only the owner can remove a stopped upload, and an admin can remove anyone's. Queued and running conversions cannot be cancelled.

## Limits

| What | Value |
|---|---|
| Largest file | 10 GB (`UPLOAD_MAX_FILE_BYTES`), refused when the upload is created (`FILE_TOO_LARGE`) |
| Free space | Uploads are taken only while the media drive has 20 GB free, twice the largest file (`NOT_READY` otherwise) |
| Open uploads per user | 3 (`SYSTEM_BUSY`) |
| Unfinished upload with no writes | Removed after 48 hours, checked every hour |
| A file that is not a video | `INVALID_FILE_TYPE` after the probe |

Any reverse proxy in front of the BFF must allow bodies of 16 MB and must not buffer the request. With nginx
that is `client_max_body_size 16m;` and `proxy_request_buffering off;` in the location of the API. The BFFs
accept 16 MB (uxp-bff) and 8 MB (vid-bff) of `application/octet-stream`. Without the proxy settings a chunk
fails with 413.

## Uploaded clips

A clip made by an upload has `uploadedBy` (the username from the login token, never from the client), `originalName`
and `uploadedAt`. They are shown on the clip page, are searchable and cannot be changed with `PATCH`.
Only uploaded clips can be deleted: `DELETE /home-videos/clips/:id` moves the file to `HomeVideos/_trash/` with its
labels and removes it from the thumbnail cache, the search index and the playlists. Trash older than 30 days is removed when the BFF
starts. Cast queues are not cleaned, a missing clip is skipped.

## API

All routes need the login cookie. Everything is below `/api`.

| Route | Purpose |
|---|---|
| `GET /uploads/status` | Whether uploads are possible (media root, free space) and the limits |
| `GET /uploads` | Everyone's unfinished uploads and conversions (not the finished) |
| `POST /uploads` | `{sizeBytes, originalName?, date?, fingerprint?}` creates or reuses a session, answers its id and offset |
| `GET /uploads/:id` | State: uploading, queued, processing, done or failed, with `clipId` or `errorCode` (results are kept 24 h) |
| `PUT /uploads/:id?offset=N` | One chunk; the last one answers queued or processing |
| `DELETE /uploads/:id` | Remove a stopped upload |
