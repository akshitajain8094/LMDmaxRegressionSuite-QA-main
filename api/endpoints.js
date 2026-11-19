// All API paths in one place. The server address comes from API_BASE_URL in the .env file.
module.exports = {
  login: '/lmd/usrsrv/users/v1/user/perf_login',
  selectStation: '/lmd/usrsrv/users/v1/switch_company/', // + station id ("Select Station" in the web app)
  // Sign-in screen of the Performance app: logout (profile menu → Log Out), the logged-in user, OTP, Forgot Password
  logout: '/lmd/usrsrv/users/v1/user/logout',
  profile: '/lmd/usrsrv/users/v1/user', // GET: the logged-in user ("Go To Profile")
  otpLogin: '/lmd/usrsrv/users/v1/login/otp', // "Sign In With OTP" → Send OTP: { field: email or phone }
  otpLoginVerify: '/lmd/usrsrv/users/v1/verify/otp', // Verify: { token, identifier, otp }
  otpLoginResend: '/lmd/usrsrv/users/v1/resend/otp', // Resend: { token, identifier }
  forgotPassword: '/lmd/usrsrv/users/v1/user/credentials/request', // "Forgot Password?" → Send OTP: { identifier }
  forgotPasswordVerify: '/lmd/usrsrv/users/v1/user/credentials/verify', // Verify: { otp, token }
  resetPassword: '/lmd/usrsrv/users/v1/user/credentials/reset', // Change Password: { otp, token, new_password }
  // Control Tower: login.lmdmax.com opens the Performance app with a login_id instead of a password
  controlTowerSignIn: '/lmd/usrsrv/control_tower/v1/sign_in_by_login_id', // { login_id, app_name, company_id }
  controlTowerLogout: '/lmd/usrsrv/control_tower/v1/control_tower_logout', // { login_id }
  dashboardData: '/dashboard/v1/dashboard_data',
  dashboardDrivers: '/dashboard/v1/dashboard_drivers',
  dashboardDataWeekly: '/dashboard/v1/dashboard_data_weekly',
  dailyInsights: '/dashboard/v1/daily_insights',
  weeklyInsights: '/dashboard/v1/weekly_insights',
  // Graph and leaderboard APIs only work with the /lmd/prfsrv prefix: BUG-API-012
  dspScorecardGraph: '/lmd/prfsrv/graph/v2/dsp_scorecard_graph',
  driverCompareScorecardGraph:
    '/lmd/prfsrv/graph/v2/driver_compare_scorecard_graph',
  driverCurrentScorecardGraph:
    '/lmd/prfsrv/graph/v2/driver_current_scorecard_graph',
  attendanceDashboard: '/lmd/prfsrv/graph/v2/attendance_dashboard',
  attendanceExtras: '/lmd/prfsrv/graph/v2/attendance_extras',
  rescueDashboard: '/lmd/prfsrv/graph/v2/rescue_dashboard',
  netradyneDashboard: '/lmd/prfsrv/graph/v2/netradyne_dashboard',
  deliveryDashboard: '/lmd/prfsrv/graph/v2/delivery_dashboard',
  qualityDashboard: '/lmd/prfsrv/graph/v2/quality_dashboard',
  eocDashboard: '/lmd/prfsrv/graph/v2/eoc_dashboard',
  eMentorDashboard: '/lmd/prfsrv/graph/v2/e_mentor_dashboard',
  leaderboardDashboard: '/lmd/prfsrv/compare/v3/dashboard',
  leaderboardInsights: '/lmd/prfsrv/compare/v3/insights',
  // Drivers: "Add Driver" on the Leaderboard tab, and the lists and profile that show drivers
  addDriver: '/lmd/usrsrv/drivers/v1/driver',
  driverStatusUpdate: '/lmd/usrsrv/drivers/v1/statusUpdate',
  saveInactiveDriver: '/lmd/prfsrv/inactive_drivers/v2/save_inactive_driver',
  driverRatingUpdate: '/lmd/prfsrv/driver_rating/v2/update_driver_rating',
  driverList: '/lmd/prfsrv/perf_driver/v3/driver_list',
  driverProfile: '/lmd/prfsrv/perf_driver/v3/drivers/', // + driver id
  // Driver lifecycle: Edit (driver profile), Suspend / Resume (Leaderboard row menu), the reports that show them
  editDriver: '/lmd/usrsrv/drivers/v1/driver/', // + driver id
  suspendDriver: '/lmd/prfsrv/suspended/v3/suspend_driver',
  resumeDriver: '/lmd/prfsrv/suspended/v3/suspend_driver/update',
  suspendedDrivers: '/lmd/prfsrv/suspended/v3/get_suspended_drivers',
  driverTimeline: '/lmd/prfsrv/driver_timeline/v3/get_timeline',
  // Write-ups (E-Signature): the manager sends them, the driver signs or refuses through a link
  writeUpTypes: '/lmd/prfsrv/management_types/v1/get_management_types',
  eSignatureCreate: '/lmd/prfsrv/e-signature/v2/create',
  eSignatureUpdate: '/lmd/prfsrv/e-signature/v2/update/', // + write-up id
  eSignatureResend: '/lmd/prfsrv/e-signature/v2/resend',
  eSignatureReport: '/lmd/prfsrv/e-signature/v1/get_report',
  eSignature: '/lmd/prfsrv/e-signature/v1/', // + write-up id: GET one, DELETE one
  eSignatureRefuse: '/lmd/prfsrv/e-signature/v1/refuse_form', // the manager marks it refused
  signForm: '/lmd/prfsrv/e-signature/v1/sign_form', // the driver's link page: GET the form, POST the signature
  signFormRefuse: '/lmd/prfsrv/e-signature/v1/refuse_form_driver', // the driver refuses on the link page
  // Call-outs (Data Management -> Callouts): a driver who does not come to work on a day
  callOutTypes: '/lmd/prfsrv/management_types/v1/get_management_types', // same API as writeUpTypes, with type=callout
  callOut: '/lmd/prfsrv/call_out/v2/call_out', // GET the list, POST add, PATCH edit, DELETE one
  // Rescues (Data Management -> Rescue): a driver (rescuer) takes over the stops of another driver (receiver)
  rescue: '/lmd/prfsrv/rescue/v2/rescue', // GET the list, POST add, PATCH edit, DELETE one
  // Settings -> Set Threshold (Scorecard, Daily Driver Scorecard, POD, ...) and Settings -> Rate your Drivers
  thresholds: '/lmd/prfsrv/threshold/v3/threshold', // POST saves; GET + '/' + type (e.g. /weekly) reads
  ratingWeightages: '/lmd/prfsrv/driver_rating/v2/weightage',
  ratingsReport: '/lmd/prfsrv/driver_rating/v2/get_ratings_report',
  // Driver page -> Weekly tab (the driver's scorecard of a week) and Driver page -> Driver Rating History
  driverScorecard: '/lmd/prfsrv/scorecard/v2/compare', // ?transporter_id=...&week_number=YYYYWW (no week: the latest)
  driverRating: '/lmd/prfsrv/driver_rating/v2/get_driver_rating', // "Rating: Week 34": ?driver_id=...&week_number=...
  driverRatingGraph: '/lmd/prfsrv/driver_rating/v2/get_rating_graph_data', // "View all week's ratings"
  driverRatingHistory: '/lmd/prfsrv/driver_rating/v2/get_driver_rating_all', // Driver Rating History: ?driver_id=...
  podReport: '/lmd/prfsrv/pod/v2/pod_report', // "POD - Quality Report": ?week_number=...&transporter_id=...
  ppsReport: '/lmd/prfsrv/pps/v2/pps_report', // the other reports of the Weekly tab (no data on DYY1 yet)
  whcReport: '/lmd/prfsrv/whc/v2/whc_report',
  daWeeklyOverview:
    '/lmd/prfsrv/da_weekly_overview/v2/da_weekly_overview_report',
  customerFeedbackReport:
    '/lmd/prfsrv/customer_feedback/v2/customer_feedback_report', // + report_type=summary

  // In-app chat (Chat → "Paya Chat" and "Individual Chat"). These paths are on another server:
  // MESSAGING_BASE_URL. api/chat.js puts the parts together, see chatPath() there.
  chatToken: '/lmd/twms/chat-slt/request/v1/company', // the chat login of the station's shared Paya Chat
  chatList: 'chathead/v5/chat_head', // the chat list (with ?keyword=)
  chatCandidates: 'chathead/v5/chat_head_get_candidate', // people without a chat yet
  chatHead: 'chathead/v5/single_chat_head/', // + room id: one row of the chat list (its preview)
  chatMessages: 'chathead/v3/get_messages/', // + room id: the conversation
  chatCreateRoom: 'chatroom/v2/create_chatroom', // start a chat with a person
  chatSendMessage: 'chat/v1/send_message',
  chatDeleteMessage: 'chat/v1/delete_message', // hover a message → Delete → "Delete Message" → Delete
  chatUploadFile: '/lmd/twms/chatroom/v3/file', // the paper clip: upload an image or a file
};
