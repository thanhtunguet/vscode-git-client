# Git Recovery Center — Implementation Plan

**Ngày:** 2026-08-26  
**Trạng thái:** Proposed  
**Phạm vi:** VS Code Git Client extension

## 1. Tóm tắt

Xây dựng **Git Recovery Center** giúp người dùng tìm và khôi phục:

- Commit bị mất sau reset, rebase hoặc xóa branch thông qua reflog.
- Commit không còn reachable thông qua object database.
- Nội dung đã từng được ghi thành Git blob, thường do `git add`, nhưng hiện không còn reachable.

Thiết kế ưu tiên các thao tác không làm thay đổi working tree. Luồng khôi phục mặc định là tạo recovery branch hoặc recovery worktree; các thao tác có khả năng phá hủy dữ liệu được tách thành nhóm Advanced và có preflight bắt buộc.

## 2. Mục tiêu

- Biến reflog thành timeline dễ đọc, có ngữ cảnh hành động và preview trực quan.
- Cho phép so sánh một recovery point với `HEAD` theo danh sách file và diff từng file.
- Khôi phục commit an toàn bằng branch hoặc detached worktree.
- Quét unreachable objects theo yêu cầu, không ghi vào `.git`.
- Preview blob theo kiểu lazy-load, có giới hạn kích thước và hỗ trợ binary.
- Không tạo cảm giác chắc chắn giả về filename, timestamp hoặc khả năng recovery.
- Hoạt động tốt trên repository lớn, có progress, cancellation và pagination.

## 3. Ngoài phạm vi

- Khôi phục file chưa từng được Git ghi thành object, ví dụ file untracked chưa từng `git add`.
- Sửa Git object bị corrupt hoặc thiếu.
- Thay thế backup, IDE local history hoặc filesystem recovery.
- Tự động chạy `git fsck` khi extension activate.
- Tự động reset hoặc overwrite working tree mà không có hành động rõ ràng từ người dùng.

## 4. Nguyên tắc an toàn

Thứ tự ưu tiên hành động:

1. Preview hoặc copy object ID.
2. Tạo recovery branch.
3. Mở recovery point trong detached worktree.
4. Cherry-pick vào branch hiện tại.
5. Hard reset, chỉ trong Advanced.

Các quy tắc bắt buộc:

- Luôn hiển thị repository path, branch hiện tại và target SHA trước thao tác mutate.
- Kiểm tra staged, unstaged và untracked changes trước cherry-pick hoặc reset.
- Tự tạo safety ref hoặc safety branch trỏ tới `HEAD` trước hard reset.
- Không dùng `git fsck --lost-found` cho scan vì option này ghi vào `.git/lost-found`.
- Không log blob content hoặc snippet có thể chứa secret.
- Không suy diễn filename hoặc timestamp của blob như dữ liệu chính xác.
- Refresh state và báo kết quả sau mọi thao tác mutate.

## 5. UX tổng thể

### 5.1 Entry points

- Command Palette: `VS Code Git Client: Open Recovery Center`.
- Icon trên SCM title khi `scmProvider == git`.
- Recovery view trong activity container hiện tại của extension.

SCM icon chỉ focus Recovery view; không chạy scan tự động.

### 5.2 Recovery TreeView

TreeView có ba root groups:

```text
Git Recovery Center — /path/to/repository
├─ Reflog Timeline
├─ Unreachable Commits
└─ Unreachable Blobs
```

- `Reflog Timeline` load ngay khi view được mở, có giới hạn số record và Load More.
- Hai nhóm unreachable hiển thị nút `Scan Repository...` cho đến khi người dùng chủ động scan.
- Nếu yêu cầu full-text search hoặc table nhiều cột trở thành bắt buộc, Phase 2 có thể mở một webview inspector riêng cho blob; không cần chuyển toàn bộ Recovery Center sang webview.

## 6. Reflog recovery

### 6.1 Data model

```ts
interface ReflogEntry {
  refName: string;
  selector: string;
  index: number;
  newOid: string;
  previousOid?: string;
  action: ReflogAction;
  message: string;
  timestamp: number;
  subject?: string;
  suggestedRecoveryOid: string;
  confidence: 'high' | 'medium';
}
```

`previousOid` được suy ra trong phạm vi cùng một reflog bằng entry kế tiếp. Không được suy ra bằng cách lấy record kế tiếp sau khi trộn nhiều refs.

Với action kiểu reset/rebase, UI cần phân biệt rõ:

```text
reset: moving to HEAD~3
before: abc123  Suggested recovery point
after:  def456
```

Không được mặc định coi hash đang hiển thị trên dòng action là commit bị mất.

### 6.2 Git commands

Đọc reflog bằng format machine-readable, có record/field separator không xung đột với subject. Ưu tiên NUL-delimited output khi Git command hỗ trợ format phù hợp.

Phạm vi mặc định:

- `HEAD` reflog trước.
- Tùy chọn `All refs` để đọc các reflog khác.
- Dedupe recovery candidates theo object ID nhưng giữ danh sách nguồn reflog.

Đảm bảo mọi candidate resolve thành commit trước khi bật branch, worktree, cherry-pick hoặc reset actions.

### 6.3 Preview flow

```text
Select reflog entry
  → resolve suggested recovery commit
  → git diff --name-status <recovery-oid> HEAD
  → show changed-file tree
  → select file
  → open vscode.diff for the two snapshots
```

So sánh recovery snapshot phải dùng direct two-tree comparison, không dùng triple-dot merge-base comparison.

Preview không checkout commit và không thay đổi index hoặc working tree.

### 6.4 Actions

#### Create Recovery Branch

- Primary action.
- Gợi ý tên `recovery/<yyyyMMdd-HHmm>-<shortSha>`.
- Validate branch name và kiểm tra collision.
- Tạo branch nhưng không checkout.

#### Open in Recovery Worktree

- Cho người dùng chọn thư mục đích.
- Mặc định tạo detached worktree tại recovery OID.
- Có tùy chọn tạo recovery branch trước rồi attach worktree vào branch đó.

#### Cherry-pick

- Hiển thị rõ đây là áp dụng delta của một commit, không phải khôi phục toàn bộ snapshot hoặc chuỗi commit.
- Yêu cầu working tree sạch hoặc người dùng xử lý thay đổi hiện tại trước.
- Tái sử dụng operation state hiện có cho conflict, continue, skip và abort.

#### Hard Reset

- Không nằm trong MVP.
- Khi được thêm, đặt trong Advanced.
- Yêu cầu modal xác nhận, clean-worktree preflight và tạo safety ref/branch trước reset.

## 7. Unreachable object recovery

### 7.1 Scan semantics

Scan mặc định phải read-only:

```text
git fsck --unreachable --no-dangling --no-progress
```

Không dùng `--lost-found`.

`--no-reflogs` chỉ xuất hiện trong chế độ Advanced với giải thích rằng kết quả sẽ nhiều hơn vì commit chỉ được reflog giữ lại cũng bị coi là unreachable.

Kết quả phải được phân loại:

- `unreachable commit`: recovery candidate cấp cao, có thể tạo branch/worktree.
- `unreachable blob`: nội dung độc lập cần inspect thủ công.
- `unreachable tree` hoặc `tag`: dữ liệu hỗ trợ, không phải primary UI item trong MVP.
- `missing`, `hash mismatch` hoặc lỗi integrity: hiển thị ở nhóm Repository Integrity, không quảng cáo là recoverable.

### 7.2 Performance model

- Scan chỉ chạy khi người dùng bấm nút.
- Chạy trong progress notification có cancellation.
- Dùng streaming parser; không buffer toàn bộ stdout trong một string.
- Dùng idle timeout thay vì wall-clock timeout cứng cho scan dài nhưng vẫn có output.
- Giới hạn số result được render một lần và hỗ trợ Load More.
- Cache kết quả theo repository + object database fingerprint trong vòng đời session.
- Hủy hoặc invalidate cache sau Git GC/prune hoặc khi user chọn Rescan.

### 7.3 Object inspection

Sau scan:

1. Dùng `git cat-file --batch-check` để lấy type và size.
2. Không đọc content cho đến khi user chọn object.
3. Chặn preview text toàn bộ nếu vượt size limit cấu hình.
4. Detect binary bằng NUL/content heuristic.
5. Với text, chỉ load preview window ban đầu; cho phép explicit `Load Full Content` nếu an toàn.
6. Với binary, hỗ trợ Save As bằng bytes, không chuyển qua JavaScript string.

### 7.4 Blob metadata

Blob item chỉ hiển thị dữ liệu có thể xác nhận:

```text
blob a1f9… · 12.4 KB · likely TypeScript
Original path: unknown
Timestamp: unavailable
```

- Language là heuristic và phải có `likely` hoặc confidence.
- Filename chỉ được hiển thị nếu tìm thấy association đáng tin cậy từ index/tree khác.
- Không dùng loose-object mtime như timestamp của source file.

### 7.5 Blob actions

- `View Read-only`.
- `Compare With File...`.
- `Save As...`.
- `Copy Content`, chỉ cho text blob dưới giới hạn.
- `Copy Object ID`.

Không cung cấp overwrite trực tiếp vào active file trong MVP. Nếu bổ sung sau này, phải dùng `WorkspaceEdit` để thay đổi có thể Undo và không tự save document.

## 8. Kiến trúc code đề xuất

### 8.1 Git plumbing

Thêm các method theo convention hiện tại trong `src/services/gitService/`:

- `getReflogEntries.ts`
- `resolveRecoveryCommit.ts`
- `getRecoverySnapshotFiles.ts`
- `scanUnreachableObjects.ts`
- `getObjectInfoBatch.ts`
- `readObjectContent.ts`
- `createRecoveryBranch.ts`, nếu semantics khác `createBranch` hiện có.

Scanner cần process runner hỗ trợ:

- streaming stdout/stderr;
- cancellation token;
- idle timeout;
- byte output limit;
- raw `Buffer` output cho binary content.

Không ép scan qua `runGit` hiện tại nếu runner đó vẫn buffer toàn bộ output và dùng timeout cứng.

### 8.2 View and orchestration

Đề xuất module:

```text
src/recovery/
├─ recoveryController.ts
├─ recoveryTreeProvider.ts
├─ recoveryTreeItems.ts
├─ reflogParser.ts
├─ fsckParser.ts
├─ recoveryTypes.ts
└─ recoverySafety.ts
```

- `RecoveryController` điều phối load, scan, cancellation và commands.
- `RecoveryTreeProvider` chỉ giữ view model, không chạy Git trực tiếp.
- Không đưa toàn bộ scan result vào `StateStore`; dữ liệu recovery là on-demand và có lifecycle riêng.
- Tái sử dụng `EditorOrchestrator` cho diff plumbing.
- Mở rộng virtual content provider với eviction/clear và size guard, hoặc tạo recovery-specific provider nếu cần raw bytes/lifecycle khác.

### 8.3 Commands and contributions

Thêm command IDs vào `GitCommand`, khai báo trong `package.json`, đăng ký qua `CommandController` hoặc recovery controller theo một convention nhất quán.

Các command tối thiểu:

- `vscodeGitClient.recovery.open`
- `vscodeGitClient.recovery.refreshReflog`
- `vscodeGitClient.recovery.scan`
- `vscodeGitClient.recovery.cancelScan`
- `vscodeGitClient.recovery.preview`
- `vscodeGitClient.recovery.createBranch`
- `vscodeGitClient.recovery.openWorktree`
- `vscodeGitClient.recovery.cherryPick`
- `vscodeGitClient.recovery.viewBlob`
- `vscodeGitClient.recovery.compareBlob`
- `vscodeGitClient.recovery.saveBlob`

Command registration tests hiện có phải tiếp tục xác nhận enum, `package.json` và runtime registration không bị lệch nhau.

## 9. Repository scoping

Recovery action phải bind vào repository cụ thể.

Trước khi hỗ trợ multi-root đầy đủ:

- Hiển thị repository root trong view title và mọi confirmation.
- SCM entry point phải truyền repository/resource context nếu có.
- Command Palette phải cho chọn repository khi workspace có nhiều Git repositories.
- Không được mặc định mutate workspace folder đầu tiên khi user đang thao tác repository khác.

## 10. Security và privacy

- Không gửi object content ra network.
- Không ghi snippet vào output channel, telemetry hoặc error report.
- Mask high-entropy strings và common credential patterns trong TreeView snippet.
- Cho phép tắt snippets hoàn toàn.
- Giới hạn số byte đưa vào syntax detector hoặc search index.
- Search blob content chỉ chạy local, on-demand và cancellable.

## 11. Error handling

Phân biệt rõ:

- Không tìm thấy candidate.
- Candidate đã bị Git GC xóa giữa scan và preview.
- Object quá lớn để preview.
- Binary object.
- Git command bị cancel hoặc timeout.
- Repository đang có merge/rebase/cherry-pick operation.
- Object database corrupt.
- Branch/worktree name hoặc path collision.

Mỗi lỗi phải có next action cụ thể; không gom tất cả thành `Git command failed`.

## 12. Test plan

### 12.1 Unit tests

- Parse reflog messages chứa separator-like characters, Unicode và newline edge cases.
- Group reflog records theo ref trước khi suy ra previous OID.
- Classify reset, rebase, checkout, commit và branch events.
- Parse `fsck` unreachable, dangling, missing và corruption lines.
- Blob language confidence, binary detection và size limit.
- Recovery branch naming và collision handling.
- Safety guard decisions cho dirty worktree.

### 12.2 Integration fixtures

Tạo temporary Git repositories cho các scenario:

- `reset --hard` làm mất một commit và nhiều commit.
- Interactive rebase drop commit.
- Xóa branch đã checkout và branch chưa checkout gần đây.
- Commit unreachable không xuất hiện trong HEAD reflog.
- `git add`, sau đó reset index làm blob trở thành unreachable.
- Blob trùng nội dung ở nhiều path.
- Binary blob và blob lớn.
- SHA-256 repository nếu Git runtime hỗ trợ.
- Linked worktree và reflog riêng của worktree.
- Repository có object corruption.
- Candidate bị `git gc/prune` xóa sau scan.

### 12.3 UI tests

- Command Palette và SCM entry point focus đúng repository.
- Load More không duplicate records.
- Cancel scan dừng process và view không bị stuck.
- Preview không thay đổi `HEAD`, index hoặc working tree.
- Branch/worktree recovery không checkout ngoài ý muốn.
- Hard reset guard không thể bỏ qua safety backup.
- Save As binary giữ nguyên bytes.

## 13. Delivery phases

### Phase 1 — Reflog MVP

- Repository-scoped Recovery TreeView.
- HEAD reflog timeline, All refs toggle và paging.
- Snapshot file list + per-file diff.
- Create Recovery Branch.
- Open in Recovery Worktree.
- Copy SHA.
- Cherry-pick với operation-state integration.

### Phase 2 — Unreachable commits

- Manual, cancellable `fsck` scan.
- Unreachable commit inspector.
- Branch/worktree recovery actions.
- Integrity diagnostics separation.

### Phase 3 — Unreachable blobs

- Batch object metadata.
- Lazy text/binary preview.
- Compare With File, Save As và Copy.
- Search/filter có giới hạn và secret masking.

### Phase 4 — Advanced recovery

- Hard Reset với clean-worktree preflight và automatic safety ref.
- Optional `--no-reflogs` deep scan.
- Recovery report/export.

## 14. Acceptance criteria

Phase 1 được coi là hoàn thành khi:

- Người dùng có thể tìm commit bị mất sau hard reset bằng reflog.
- UI chỉ đúng trạng thái before/after và suggested recovery point.
- Người dùng preview được file list và diff mà repository không thay đổi.
- Recovery branch/worktree được tạo mà không checkout hoặc overwrite working tree ngoài ý muốn.
- Multi-root không thể dẫn đến mutate nhầm repository.
- Mọi command mới có unit/registration tests.

Phase 3 được coi là hoàn thành khi:

- Scan không ghi vào `.git/lost-found`.
- Scan có progress, cancellation và không buffer output không giới hạn.
- Blob lớn/binary không bị ép vào string hoặc render toàn bộ.
- UI không tuyên bố filename/timestamp không thể xác nhận.
- Save As khôi phục đúng bytes của object.

## 15. Rủi ro chính

| Rủi ro | Giảm thiểu |
|---|---|
| Người dùng reset nhầm recovery point | Hiển thị before/after, preview và safety branch |
| Scan quá chậm trên repo lớn | Manual scan, streaming, cancellation, pagination |
| Hàng nghìn blob nhiễu | Ưu tiên commits, lazy metadata/content, filter |
| Blob chứa secret | Không log content, mask snippet, local-only search |
| Candidate bị GC xóa | Resolve lại ngay trước action và báo recovery window không được đảm bảo |
| Multi-root mutate nhầm repo | Explicit repository binding và confirmation path |
| Memory tăng do virtual documents | Eviction, clear lifecycle và preview size cap |

