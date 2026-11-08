# 작업 규칙
- 사용자 응답은 한국어로 작성한다.
- 사용자가 2026-11-08에 요청: 이 프로젝트 수정 작업을 완료하면 관련 변경을 Git 커밋하고 GitHub origin/main에 푸시한다. 매번 재확인하지 않는다.
- 관련 없는 변경이나 비밀키는 포함하지 않는다. 강제 푸시하지 않는다.
- 공개 사이트: https://gangneung-my-ai-lab.yoon2566.workers.dev
- 저장소: https://github.com/yoon2566/gangneung-my-ai-lab
- index.html은 독립 실행 가능한 원본이다. worker.js에서 텍스트 모듈로 가져와 서비스한다.
- Cloudflare API multipart 업로드: worker.js는 application/javascript+module, index.html은 text/plain, metadata.main_module은 worker.js.
- 실제 AI 연결 전까지 예시 모드 안내를 유지한다.
