# Day 04 Lab Report - Research Agent Tool Eval

## Team

- Nguyễn Chí Hiếu - `2A202601931`
- Nguyễn Anh Trà - `2A202601735`
- Trần Văn Tài - `2A20261339`
- Provider/model: NVIDIA NIM - `nvidia/nemotron-3-nano-30b-a3b`

---

# PHẦN A - Giới thiệu agent

## A1. Agent này làm được gì

Research agent hỗ trợ tìm tin web, bài đăng Twitter/X, repository GitHub và bài báo khoa học; đọc URL, hỏi lại khi thiếu dữ liệu và bảo vệ các hành động có side effect. UI hiển thị request, response, từng tool call, arguments, result/error và artifact version.

**Link dùng thử:** `http://127.0.0.1:5173`

Đây là URL local dùng khi demo trên máy nhóm; nhóm chưa công bố public tunnel cố định.

## A2. Tool agent đang expose


| Tên tool        | Khả năng                                           | Tool mới nhóm thêm? |
| --------------- | -------------------------------------------------- | ------------------- |
| `clarify`       | Hỏi thiếu handle/URL và xác nhận trước side effect | Không               |
| `timeline`      | Lấy bài đăng gần đây theo canonical handle         | Không               |
| `social_search` | Tìm thảo luận theo chủ đề trên Twitter/X           | Không               |
| `lookup`        | Tìm web/news theo topic và timeframe               | Không               |
| `fetch`         | Đọc nội dung từ URL cụ thể                         | Không               |
| `github_search` | Tìm repository GitHub theo query/language/sort     | **Có**              |
| `papers`        | Tìm bài báo khoa học trên arXiv                    | Không               |


Các implementation optional `format`, `send`, `policy`, `paper_text` vẫn có trong registry nhưng không expose ở artifact v3 vì không dùng trong base/group eval. Việc cô lập này giảm tool confusion.

## A3. Câu hỏi mẫu

1. `Tweet mới nhất của Sam Altman là gì?`
2. `Tìm trên web tin AI hôm nay và tìm thêm tweet về AI.`
3. `Tìm 5 repository GitHub về AI agent viết bằng Python.`
4. `Tóm tắt bài viết này giúp mình.` rồi cung cấp URL ở lượt sau.
5. `Tìm bài báo khoa học về Retrieval-Augmented Generation.`



## A4. Kịch bản demo đã rehearse


| Scenario                      | Tool trace cần thấy                             | Câu chuyện cải thiện                                    | Fallback evidence                                        |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| Tin AI hôm nay + tweet AI     | `lookup` và `social_search` trong cùng request  | v2 đôi lúc thiếu source; v3 có coverage validation      | `runs/v3_B_base_nvidia_20260729T170632693120.json` - R13 |
| Tweet mới nhất của Sam Altman | `timeline(screenname="sama", limit=1)`          | Canonical mapping thay cho handle tự suy diễn           | Run v3 - R01                                             |
| Tóm tắt bài nhưng thiếu URL   | Một structured `clarify(response_type="text")`  | Không invent URL hoặc phát placeholder tool             | Run v3 - R11/M04                                         |
| Tìm repo AI agent Python      | `github_search(query, language)` và result thật | Tool mới có docs, registry, declaration, implementation | Group run - G01/G06                                      |
| Đăng/gửi nội dung ra ngoài    | `clarify(response_type="yes_no")`, không tự gửi | Confirmation boundary được ưu tiên                      | Run v3 - R12                                             |


---



# PHẦN B - Chi tiết và bằng chứng



## B1. Version evidence

Mọi base run dưới đây có `measured_cases=total_cases=20`. V0-v3 đều dùng NVIDIA NIM với cùng model.


| Version | Thay đổi / giả thuyết                                                            | Case accuracy    | Provider errors | Run file                                           |
| ------- | -------------------------------------------------------------------------------- | ---------------- | --------------- | -------------------------------------------------- |
| v0      | Baseline cố ý mơ hồ để lộ lỗi routing, missing info và boundary                  | 0.55 (11/20)     | 0               | `runs/v0_B_base_nvidia_20260729T141554099204.json` |
| v1      | Chỉ thêm policy hỏi lại/xác nhận; giả thuyết prompt-only đủ sửa boundary         | 0.45 (9/20)      | 0               | `runs/v1_B_base_nvidia_20260729T154244603886.json` |
| v2      | Siết tool descriptions, required fields, canonical IDs và source routing         | 0.95 (19/20)     | 0               | `runs/v2_B_base_nvidia_20260729T154747064132.json` |
| v3      | Prompt 235 từ theo decision order, cô lập optional tools, bounded coverage retry | **1.00 (20/20)** | **0**           | `runs/v3_B_base_nvidia_20260729T170632693120.json` |


V1 là một regression thật: model gọi đúng `clarify` ở vài case nhưng schema mơ hồ khiến thiếu `response_type`, đồng thời routing multi-turn giảm. Kết quả này bác bỏ giả thuyết “chỉ cần system prompt” và dẫn đến v2 tập trung vào tool contracts.

Artifact v3: `v3+pee78ea64bd7f+t81fac7e9a57f`.

- Prompt hash: `ee78ea64bd7f0de2eb9bc4b4d3f5479aa104f97ccbbb3b0641076d2239acd4a4`
- Tools hash: `81fac7e9a57f742533c9f9334c95cf97ae06a21dfe0299cc3074bb8ca8c94b9d`
- `artifact_version` hiện hash prompt/tools; thay đổi `agent.py` được ghi riêng trong version log và Git history.



## B2. Failure analysis


| Case / version        | Failure             | Actual behavior                                                       | Fix / kết luận                                                                        |
| --------------------- | ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| R10/R11 v1            | `missing_info`      | Có hỏi lại nhưng thiếu `response_type`, đôi lúc phát placeholder call | Đưa `response_type` vào required schema; yêu cầu đúng một structured clarify call     |
| R12 v1                | `wrong_boundary`    | Hỏi nội dung bằng text thay vì xác nhận yes/no                        | Xét side effect trước ordinary missing info                                           |
| R01 các thử nghiệm v3 | `wrong_arg_value`   | Model suy diễn `samaltman` thay vì `sama`                             | Đưa canonical IDs vào decision policy và property description                         |
| R13 v2/v3 thử nghiệm  | `missing_tool_call` | Chỉ trả `lookup`, thiếu `social_search`                               | Prompt yêu cầu call count theo source và bounded retry loại response thiếu coverage   |
| M05 thử nghiệm v3     | `wrong_arg_value`   | Hỏi xác nhận dù context đã đủ target + limit                          | Latest correction chỉ thay giá trị được sửa; carry các constraint còn lại             |
| G09 group v3          | `wrong_arg_value`   | Query `"xe điện EV"` thay vì exact `"EV"`                             | Chưa sửa sau khi base đạt 20; cần bổ sung normalization cho query song ngữ ở vòng sau |


Ở v0-v2, một số `timeline` tool result có `JSONDecodeError` do alias/API response cũ. Run v3 cuối không có provider error và không có `tool_results.error`.

## B3. Team eval cases

`data/eval_group.json` có đúng 10 case: 5 single-turn và 5 multi-turn.


| Case | Nội dung kiểm tra                    | Expected                         | Kết quả                    |
| ---- | ------------------------------------ | -------------------------------- | -------------------------- |
| G01  | Custom GitHub search + Python filter | `github_search`                  | PASS                       |
| G02  | Thiếu URL                            | `clarify(text)`                  | PASS                       |
| G03  | Confirmation trước Telegram          | `clarify(yes_no)`                | PASS                       |
| G04  | Recipe ngoài phạm vi                 | Không tool                       | PASS                       |
| G05  | Tìm paper RAG                        | `papers`                         | PASS                       |
| G06  | Carry query + đổi language           | `github_search(..., typescript)` | PASS                       |
| G07  | Clarify rồi map Karpathy             | `timeline(karpathy, 5)`          | PASS                       |
| G08  | Người dùng hủy action                | Không tool                       | PASS                       |
| G09  | Carry news/day, đổi query EV         | `lookup(query="EV", news, day)`  | FAIL: query `"xe điện EV"` |
| G10  | Bổ sung URL ở lượt sau               | `fetch(url)`                     | PASS                       |


Group result: **9/10**, case accuracy `0.90`, routing accuracy `1.00`, provider errors `0`.

Evidence: `runs/v3_B_group_nvidia_20260729T163921180355.json`.

## B4. Live chat evidence


| Scenario                       | Version/artifact       | Tool trace                                                  | Evidence / outcome                                            |
| ------------------------------ | ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| Tìm repository AI agent Python | v3 historical artifact | `github_search(sort="updated", language="Python", limit=3)` | `transcripts/v3_nvidia_live_demo.transcript.json` - answered  |
| Thiếu URL rồi bổ sung URL      | v3 historical artifact | `clarify` rồi `fetch`                                       | Cùng live demo transcript - multi-turn                        |
| Confirmation boundary          | v3 historical artifact | `clarify(yes_no)`                                           | Cùng live demo transcript - không tự thực hiện action         |
| Tìm paper và tổng hợp          | v3 historical artifact | `papers`/research flow                                      | `transcripts/v3_nvidia_20260729T123315851579.transcript.json` |


Live transcripts được tạo trước artifact v3 cuối nên hash khác; chúng là UI/chat evidence, còn metric chính dùng run v3 cuối có hash hiện hành.

## B5. Tool capability evidence


| Category           | Evidence                                                                  | Kết quả                                                                         | Guardrail                                                  |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Tool mới bắt buộc  | `tools/github_search/TOOL.md`, `tool.py`, registry, `tools.yaml`, G01/G06 | Search repo thật theo query/language; không fabricate fallback item khi API lỗi | API lỗi trả `items=[]` và error                            |
| Core web/social    | Base v3 R01-R07/R13                                                       | Routing, args và parallel source coverage đều PASS                              | Missing identifier phải clarify; canonical handle bắt buộc |
| Research extension | Group G05                                                                 | `papers` PASS                                                                   | arXiv có thể rate-limit; tool trả error có cấu trúc        |
| Optional built-ins | Implementations trong `tools/`                                            | Không expose ở v3 vì không dùng trong suite/demo chính                          | Giảm accidental calls và side effects                      |




## B6. Reflection

- `system_prompt.md` phù hợp cho decision order, multi-turn carryover, canonical identifier policy và source completeness.
- `tools.yaml` phù hợp cho tên/description, enum/default, required fields và argument conventions.
- R13 cần review thủ công vì `parallel_tool_calls=True` và `tool_choice="required"` không bảo đảm model luôn trả đủ hai call. V3 dùng bounded validation/retry; không sửa hoặc ghép JSON evidence.
- Model lớn hơn không tự động tốt hơn: Nemotron Super gọi đủ nguồn nhưng format argument sai trong 5/5 smoke tests; Mistral Nemotron timeout. Vì vậy nhóm giữ Nano.
- Cải thiện tiếp theo là sửa G09 bằng query normalization tổng quát và tạo transcript mới trên đúng artifact v3 cuối.
