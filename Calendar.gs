/**
 * 今日行事曆。預設讀 primary。
 */

function fetchTodayEvents_() {
  var calId = getProp_(PROP_KEYS.CALENDAR_ID, 'primary');
  var cal;
  if (calId === 'primary') {
    cal = CalendarApp.getDefaultCalendar();
  } else {
    cal = CalendarApp.getCalendarById(calId);
  }
  if (!cal) throw new Error('Calendar not found: ' + calId);

  var now = new Date();
  var events = cal.getEventsForDay(now);

  var tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  var out = events.map(function (ev) {
    var allDay = ev.isAllDayEvent();
    var start = ev.getStartTime();
    var end = ev.getEndTime();

    var time;
    if (allDay) {
      time = '全日';
    } else {
      var s = Utilities.formatDate(start, tz, 'HH:mm');
      var e = Utilities.formatDate(end, tz, 'HH:mm');
      // 若起訖同分鐘（例如純提醒）只顯示一個時間
      time = (s === e) ? s : (s + ' — ' + e);
    }

    var status, remainMin;
    if (allDay) {
      status = 'later';
      remainMin = 0;
    } else if (start <= now && now < end) {
      status = 'ongoing';
      remainMin = Math.max(0, Math.round((end - now) / 60000));
    } else if (start > now) {
      var minsUntil = Math.round((start - now) / 60000);
      status = (minsUntil <= 60) ? 'upcoming' : 'later';
      remainMin = minsUntil;
    } else {
      // 已結束（理論上 getEventsForDay 仍會包含）
      status = 'past';
      remainMin = Math.round((now - end) / 60000);
    }

    return {
      time: time,
      name: ev.getTitle() || '(未命名)',
      loc:  ev.getLocation() || '',
      status: status,
      remainMin: remainMin,
      allDay: allDay
    };
  });

  // 過濾掉已結束的、用開始時間升冪
  out = out.filter(function (e) { return e.status !== 'past'; });
  out.sort(function (a, b) {
    // ongoing 永遠排第一
    if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
    if (b.status === 'ongoing' && a.status !== 'ongoing') return 1;
    return a.remainMin - b.remainMin;
  });

  return { events: out };
}
