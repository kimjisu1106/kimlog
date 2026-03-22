---
layout: post
title: Unreal Engine 5 Dev Log 3 ― 전자 피아노 + MIDI = 소리와 빛으로 반응하는 UE5 피아노
date: 2025-09-09
categories:
  - devlog
  - ue5
  - summary
project: midi-piano
project_name: 전자 피아노 + MIDI
video_id: Z8psLvewAE8
redirect_to:
status: finished
---
![](https://blog.kakaocdn.net/dna/bxT1FU/dJMcahbJHX2/AAAAAAAAAAAAAAAAAAAAAFcAuw3rCjyLCdzKhs6gNpmKx_27B2oKQTdGh2-0zHwm/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1764514799&allow_ip=&allow_referer=&signature=OYNQ%2FqBdN%2B05jqOjTbXZM2dElRM%3D)


## 요약

전자 피아노의 MIDI 신호로 UE5에서 88건반 사운드+발광을 트리거하는 프로토타입을 만들었다.  
건반은 머티리얼의 Emissive를 실시간 제어하고, 오디오는 옥타브 샘플 몇 개로 피치배수를 적용해 전 음계를 생성했다.  
버벅임 최소화/간헐적 타이머 중복/장치 인식 문제를 풀링(AC 풀)과 DoOnce/딜레이 한 프레임으로 해결.

---
## 제작 동기


UE를 세 번째 켰을 때 문득 떠오른 생각:  
“MIDI 신호로 언리얼 안의 무언가를 ‘연주’할 수 있을까?”  
DAW에서의 MIDI는 익숙하지만, 게임/공연 환경에서 외부 컨트롤러처럼 쓰는 상상에서 출발했다.  
내게는 이미 MIDI Out을 지원하는 전자피아노가 있었고, UE5 안에 피아노를 만들면 가장 직관적일 것 같았다.  
유튜브의 피아노 비주얼라이제이션처럼, 눌린 음만 빛나고 소리가 나는 화면을 직접 구현하고 싶었다.

---
## 목표 설정

MIDI Controller를 만드는게 가능해졌다고 해서 무분별하게 가지를 뻗어나갈 수는 없었다. 나는 최대한 학원 수강이 시작되기 전에 다양한 것을 삽질해보고 싶었기 때문에 프로젝트 당 최대 작업기간을 일주일로 잡았다. 그러나 실제로는 2일 초과되었다.

- 기간 제한: 프로젝트당 1주(실제 4일: 연차 1일, 주말 2일, 퇴근 후 0.5일×2)
- 일정: 시작 2025-08-31 / 종료 2025-09-09
- 기능 목표
    1. 88 Key
    2. MIDI Note On → 해당 건반 발광 + 음원 재생, 일정 시간 후 자동 소등
    3. 건반 색은 단색 고정이 아니라 팔레트 순환 패턴
    4. Sustain/Velocity 미사용 (간소화)
    5. 연주 중 버벅임 최소화  

---
## MIDI 컨트롤러 세팅

처음엔 5핀 MIDI를 오디오/MIDI 인터페이스로 연결했는데, UE의 MIDI 로그가 세밀한 간격으로 계속 업데이트되어 In/Out 구분이 혼동됐다.
USB B→A로 깔끔하게 인/아웃을 전송하는 다른 전자피아노로 교체하니 안정적으로 신호를 받을 수 있었다

---
## 오디오 소스 설계 (피치배수)

Logic Pro의 Yamaha Grand Piano를 원음으로 사용(개인 취향).  

88개 소스를 전부 만드는 대신, 옥타브마다 C / E / G## 길이 2~3초 샘플만 만들고, UE Sound Cue에서 피치배수로 모든 반음계를 생성했다.

공식: 배수 = 2^{n/12} (n: 반음 개수)

- C4 → C#4: n = 1 → 2^{1/12} ≒ 1.059463
- C4 → Bb3(A#3) : n = -2 → 2^{-2/12} ≒ 0.890899

피치 시프팅 특유의 인공적인 느낌 없이 자연스럽게 들린 점이 의외로 만족스러웠다.  

다만 결국 88개 전 음에 대해 Sound Cue+피치 설정을 하다 보니, “차라리 88 소스를 직접 넣는 편이 더 단순했을까?”라는 생각도 남았다(성능/관리성).

이름 규칙(사운드): Piano_{노트번호}{노트명}_Cue
예) Piano_21A0_Cue, Piano_60C4_Cue
  

![](https://blog.kakaocdn.net/dna/CgLLO/dJMcagDTOeo/AAAAAAAAAAAAAAAAAAAAACyKih6T7LyH-jMLpeN2jXf0KyNWhfM7beshA0Fluxgu/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1764514799&allow_ip=&allow_referer=&signature=afQkfZXck5lGWFyUj3OnqYi%2Fzzo%3D)


![](https://blog.kakaocdn.net/dna/RLsX3/dJMcah3SpnF/AAAAAAAAAAAAAAAAAAAAACghvnl1JmKcios2xjnCk-DOVkhtZHfJ1quaX6eQOmq8/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1764514799&allow_ip=&allow_referer=&signature=5mcoI8S2m8zuwwdRCfb%2Bee4EeRU%3D)


---

## 건반(비주얼) 구현

#### 메시 / 머티리얼

흑건과 백건은 기본적으로 Cube를 베이스로 해서 색만 바꿔서 사용했다.(M_Black, M_White)  
Emissive 제어용 파라미터를 내장했다.

- VectorParameter: EmissiveColor(1,1,1,1)
- ScalarParameter: EmissiveIntensity(0.0)  
    → Multiply로 Material의 Emissive Color에 꽂았다.

#### 형상

그동안 크게 인식할 일이 없었는데 건반들이 다 똑같이 생긴게 아니었다.

흑건은 차이가 없었지만 백건은 음마다 조금씩 모양이 달라서 Static Mesh 를 배치한 후 액터를 병합하여 7종의 건반을 만들었다.

네이밍: SM_Piano_C / D / E, B / F / G / A / A0

#### 네이밍(배치된 88건반)

기호(#/♭) 대신 s 사용  
형식: SM_{노트번호}{노트명}  
예) SM_21A0, SM_60C4, SM_61Cs4

#### 액터/컴포넌트 구조

BP_Piano 액터 하나에 모든 건반을 컴포넌트로 구성(탐색·제어 단순화)

![](https://blog.kakaocdn.net/dna/bHH96a/dJMcagDTOeq/AAAAAAAAAAAAAAAAAAAAAGSr8WGC_istd38S-GrjioaH3NkuEXnIh92j1I3ipzYL/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1764514799&allow_ip=&allow_referer=&signature=HiIxRnH2HB7%2FwSMMf159e5PHNl0%3D)


![](https://blog.kakaocdn.net/dna/b1uET2/dJMcacuJlR2/AAAAAAAAAAAAAAAAAAAAAId6lA_IlQDixGZasWi-rKan3cztKYbNFrJuozCGl18t/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1764514799&allow_ip=&allow_referer=&signature=yOvFnExXzCKdExrr3fxQ0TYykHQ%3D)


---

## BP_MidiManager 파이프 라인 (요약)

#### Event Begin Play

1. DoOnce (중복 생성/바인딩 방지)
2. Delay(0.0) 한 프레임 미룸(컴포넌트 등록 완료 보장)
3. Set AC88: 88개의 AudioComponent 풀 생성 (Index = Note-21)
4. BuildNoteMap: BP_Piano의 각 건반 컴포넌트 태그(Note_60 등)를 스캔해 노트번호→컴포넌트 맵 구성
5. Set Midi Controller: 입력 장치 탐색 → 컨트롤러 생성 → Note On/Off 이벤트 바인딩

#### Note On

1. if Velocity == 0, Note Off 처리로 우회
2. 범위 체크(A0=21 ~ C8=108)
3. 오디오 재생: 인덱스 계산(Idx=Note-21), 기존 AC 중지 후 즉시 Play(0.0)
4. DMI 캐시 조회/생성 → 색상/밝기 설정 → 소등 타이머 예약

#### Note Off

짧은 타이머로 자연 감쇠 연출
#### 소등 스윕(0.002s 루프 타이머)

NoteToOffTimer의 남은 시간 확인 → 시간 만료 노트는 Emissive 0.0으로 내리고 맵에서 제거


---

### BP_MidiManager 전역 변수

1. DeviceID(Int)
2. MidiController : MIDIDeviceInputController(Object Reference)  
    : 실제 이벤트를 발생시키는 컨트롤러. 전역 변수가 아닌 로컬의 경우 중간에 끊길 수 있음.
3. PianoActor  
    : BP Piano. 건반 Components의 모임
4. Sound88 : Array〈SoundBase〉  
    : 88개의 오디오가 들어있는 배열.
5. AC88 : Array〈AudioComponent〉  
    : 88개 오디오 컴포넌트 풀. Index = Note-21
6. ColorArray : Array〈LinearColor〉  
    : 미리 지정해둔 15색 팔레트.
7. ColorCursor(Int)  
    : Color Array의 순환 인덱스. (ColorCursor+1) % Length.
8. NoteToComp : Map〈Integer, StaticMeshComponent〉  
    : MIDI 노트 번호(21-108) → 해당 건반 메시 컴포넌트
9. NoteToDMI : Map〈Integer, MaterialInstanceDynamic〉  
    : 노트 → 건반의 DMI(Material Instance Dynamic).
10. ColorParamName : Name  
    : Vector Parameter 이름. "EmissiveColor"
11. EmissiveParamName : Name  
    : Scalar Parameter 이름. "EmissiveIntensity"
12. EmissiveMax : Float  
    : 켤 때 최대 밝기.
13. NoteToOffTimer : Map〈Integer, TimerHandle〉  
    : 노트별 소등 타이머 핸들.
14. FlashDuration: Float  
    : 불 켜짐 유지 시간.

---
### Do Once

PIE 재시작, 레벨 스트리밍, BeginPlay 중복 호출에서 AC88 중복 생성이나 바인딩 누적 방지.

---
### Delay(Duration 0.0)

BeginPlay 다음 프레임으로 미뤄서 레이스 컨디션 방지. 
BP_Piano 컴포넌트 전부 등록된 후에 BuildNoteMap()이 실행될 수 있도록 한 프레임 늦추기.

---
### Set AC88

88개 AudioComponent 풀 생성.
Index로는 Note-21을 사용.
Note는 가장 낮은 음인 A0가 21이고, Sound88과 AC88의 첫 배열인 Sound88[0]과 AC88[0]이 바로 그 A0와 매칭되어야 하기 때문.

1. For Loop(0, Sound88.Length - 1)
	: Sound88의 Index 범위 정하기
2. IsValid(Sound88[i]) 검사.
	: 88개 중 하나라도 비어있으면 AC 생성 안되도록
3. Add Audio Component → ReturnValue = AC
	: Audio Component 생성
4. Set Auto Activate(AC, false)
5. Set Sound(AC, Sound88[i])
	: 생성한 Audio Component에 Sound88 매치
6. Set Array Elem(AC88, i, AC, SizeToFit = True)
	: 배열이 짧으면 자동 확장.

---
### Build Note Map

건반(BP_Piano) 안에 있는 각 Component를 찾아서 이름을 부여하는 함수.
각 건반의 이름은 SM_61Cs4 이런 방식이었기 때문에 각 컴포넌트에 아래와 같은 방식으로 태그를 달았다.
컴포넌트태그 방식: Note+노트번호
	: 예) Note_61, Note_108

1. PianoActor.Get Components by Class(StaticMeshComponent) → For Each Loop 
	: 피아노 액터에서 건반 컴포넌트 수집.
2. comp.ComponentTags (Name[]) → For Each Loop
	: 각 컴포넌트 태그 검사.
3. Convert_NameToString(tag)
	: Name → String.
4. StartsWith("Note_")
	: Note_가 있는 태그들을 선별.
5. RightChop(5)
	: 예) "Note_60" → "60".
6. StringToInt  
	: "60" → 60 (이 값이 맵 키).
7. InRangeIntInclusive(21, 108)
	: 맵 키가 21~108사이인지 검사
8. NoteToComp.Add(Key = 6의 note, Value = 1의 comp)

---
### Set Midi Controller

1. Find All MIDI Device Info(Out MIDIInput Devices) → ForEachLoop → Device ID = Set DeviceID(Integer)
	: 입력 가능한 디바이스 찾기.
2. Create MIDI Device Input Controller(This Device Id = DeviceID) → ReturnValue를 MidiController에 저장
	: 컨트롤러 생성.
3. IsValid(MidiController)
	: 컨트롤러 유효성 체크.
4. MidiController → Assign On MIDINote On / Assign On MIDINoteOff
	: 해당 컨트롤러의 MIDINote On/Off 신호 사용.

---
### Get or Create DMI

DMI = Material Instance Dynamic. 런타임에서 파라미터가 바뀌는 인스턴스. 

이 함수는 NoteToDMI.Find(Note)로 이미 캐시된 DMI를 돌려준다.  
1. NoteToDMI.Find(Note) 체크
	→ True? Return Node(FoundValue = DMI)
	→ False? Create DMI
2. NoteToComp.Find(Note) 체크
	→ True? Create Dynamic Material Instance(FoundValue) 
		→ NoteToDMI.Add(Note, FoundValue) 
		→ Return Node(FoundValue = DMI)
	→ False? Return Node()


---

### Set Note Color and Emissive

Note의 색, 밝기, 지속시간 설정

1. Get or Create DMI 체크
	→ True? Set_NoteColorAndEmissive
2. Set Scalar Parameter Value(DMI, Emissive Param Name, Emissive Max)
	: 밝기 변경 / 소등.
3. Current Color = Get(ColorArray, ColorCursor)
	: ColorCursor를 인덱스로 하는 현재 색상 설정
4. Set Vector Parameter Value(DMI, Color Param Name, Current Color)
	: 색 변경.
5. Set ColorCursor = (ColorCursor + 1) % Length(ColorArray)
	: ColorCursor 업데이트 

---
### NoteToOffTimer

Note 소등 예약

1. NoteToOffTimer.Find(Note) 체크
     → True? Clear and Invalidate Timer by Handle(FoundValue) → Remove(Note) → Set Timer by Event
     : 이미 타이머가 있으면 기존 타이머 삭제 후 타이머 재설정
	→ False? Set Timer by Event(Time)
	: 타이머가 없으면 바로 타이머 설정
2. Set Timer by Event
     1. Event = CreateEvent
	     1. NoteToOffTimer.Keys() → ForEachLoop
	     2. NoteToOffTimer.Find(Key) 체크
	        → True? Rem = Get Timer Remaining Time by Handle(Handle)
               if (Rem ≤ 0.001) →
	               NoteToDMI.Find(Key) True → SetScalar(DMI,"EmissiveIntensity",0.0)
	               NoteToOffTimer.Remove(Key)
	               Keys()는 매번 함수 호출 결과를 ForEach에 꽂는다. 따라서 저장된 배열 변수 말고, 함수 반환을 직접 연결.
     2. Time = Note.Divide % 7 → ReturnValue.Multiply 0.002 → ReturnValue.Add
     3. FlashDuration
        : Flash 시간을 살짝 흩뿌리기
3. NoteToOffTimer.Add(Note, ReturnValue)
	: 각 Note에 종료 타이머 설정

---

### NoteOff

NoteOff되면 짧은 타이머

1. 범위 체크: InRangeIntInclusive(Note, 21, 108)
   : NoteID가 A0~C8인지 체크
2. NoteToOffTimer의 Set Timer by Event

---
## 배운점

1. 네이밍 규칙은 처음부터 잘 생각하고 하자. 88개의 건반과 오디오 이름을 몇번이나 반복해서 변경해야했다.
2. 플러그인 'Midi Controller'와 동시 사용이 불가하다.

---
## 마무리

“MIDI 신호를 이용해 무언가를 만들어보고 싶다”는 단순한 목표로 시작해, UE5에서 ‘연주 가능한’ 시각·청각 시스템을 만들었다.  

아직 투박하지만, 건반을 누를 때마다 건반이 빛나고 소리도 같이 재생된다.

---

## 결과

{% include youtube.html id=page.video_id %}

---