Path = require('path')
http = require('http')
http.globalAgent.maxSockets = 300

# Make time interval config easier.
seconds = 1000
minutes = 60 * seconds

# These credentials are used for authenticating api requests
# between services that may need to go over public channels
httpAuthUser = "sharelatex"
httpAuthPass = "password"
httpAuthUsers = {}
httpAuthUsers[httpAuthUser] = httpAuthPass

sessionSecret = "secret-please-change"

module.exports = settings =

	allowAnonymousReadAndWriteSharing:
		process.env['SHARELATEX_ALLOW_ANONYMOUS_READ_AND_WRITE_SHARING'] == 'true'


	# File storage
	# ------------
	#
	# ShareLaTeX stores binary files like images in S3.
	# Fill in your Amazon S3 credential below.
	s3:
		key: ""
		secret: ""
		bucketName : ""


	# Databases
	# ---------
	mongo:
		url : process.env['MONGO_URL'] || "mongodb://#{process.env['MONGO_HOST'] or '127.0.0.1'}/sharelatex"

	redis:
		web:
			host: process.env['REDIS_HOST'] || "localhost"
			port: process.env['REDIS_PORT'] || "6379"
			password: ""

		# websessions:
		# 	cluster: [
		# 		{host: 'localhost', port: 7000}
		# 		{host: 'localhost', port: 7001}
		# 		{host: 'localhost', port: 7002}
		# 		{host: 'localhost', port: 7003}
		# 		{host: 'localhost', port: 7004}
		# 		{host: 'localhost', port: 7005}
		# 	]

		# ratelimiter:
		# 	cluster: [
		# 		{host: 'localhost', port: 7000}
		# 		{host: 'localhost', port: 7001}
		# 		{host: 'localhost', port: 7002}
		# 		{host: 'localhost', port: 7003}
		# 		{host: 'localhost', port: 7004}
		# 		{host: 'localhost', port: 7005}
		# 	]

		# cooldown:
		# 	cluster: [
		# 		{host: 'localhost', port: 7000}
		# 		{host: 'localhost', port: 7001}
		# 		{host: 'localhost', port: 7002}
		# 		{host: 'localhost', port: 7003}
		# 		{host: 'localhost', port: 7004}
		# 		{host: 'localhost', port: 7005}
		# 	]

		api:
			host: process.env['REDIS_HOST'] || "localhost"
			port: process.env['REDIS_PORT'] || "6379"
			password: ""

	# Service locations
	# -----------------

	# Configure which ports to run each service on. Generally you
	# can leave these as they are unless you have some other services
	# running which conflict, or want to run the web process on port 80.
	internal:
		web:
			port: webPort = 3000
			host: process.env['LISTEN_ADDRESS'] or 'localhost'
		documentupdater:
			port: docUpdaterPort = 3003

	# Tell each service where to find the other services. If everything
	# is running locally then this is easy, but they exist as separate config
	# options incase you want to run some services on remote hosts.
	apis:
		web:
			url: "http://#{process.env['WEB_HOST'] or 'localhost'}:#{webPort}"
			user: httpAuthUser
			pass: httpAuthPass
		documentupdater:
			url : "http://#{process.env['DOCUPDATER_HOST'] or 'localhost'}:#{docUpdaterPort}"
		thirdPartyDataStore:
			url : "http://#{process.env['TPDS_HOST'] or 'localhost'}:3002"
			emptyProjectFlushDelayMiliseconds: 5 * seconds
		tags:
			url :"http://#{process.env['TAGS_HOST'] or 'localhost'}:3012"
		spelling:
			url : "http://#{process.env['SPELLING_HOST'] or 'localhost'}:3005"
		trackchanges:
			url : "http://#{process.env['TRACK_CHANGES_HOST'] or 'localhost'}:3015"
		project_history:
			sendProjectStructureOps: process.env.PROJECT_HISTORY_ENABLED == 'true' or false
			initializeHistoryForNewProjects: process.env.PROJECT_HISTORY_ENABLED == 'true' or false
			displayHistoryForNewProjects: process.env.PROJECT_HISTORY_ENABLED == 'true' or false
			url : "http://#{process.env['PROJECT_HISTORY_HOST'] or 'localhost'}:3054"
		docstore:
			url : "http://#{process.env['DOCSTORE_HOST'] or 'localhost'}:3016"
			pubUrl: "http://#{process.env['DOCSTORE_HOST'] or 'localhost'}:3016"
		chat:
			url: "http://#{process.env['CHAT_HOST'] or 'localhost'}:3010"
			internal_url: "http://#{process.env['CHAT_HOST'] or 'localhost'}:3010"
		blog:
			url: "http://localhost:3008"
			port: 3008
		university:
			url: "http://localhost:3011"
		filestore:
			url: "http://#{process.env['FILESTORE_HOST'] or 'localhost'}:3009"
		clsi:
			url: "http://#{process.env['CLSI_HOST'] or 'localhost'}:3013"
		templates:
			url: "http://#{process.env['TEMPLATES_HOST'] or 'localhost'}:3007"
		githubSync:
			url: "http://#{process.env['GITHUB_SYNC_HOST'] or 'localhost'}:3022"
		recurly:
			privateKey: ""
			apiKey: ""
			subdomain: ""
		geoIpLookup:
			url: "http://#{process.env['GEOIP_HOST'] or 'localhost'}:8080/json/"
		realTime:
			url: "http://#{process.env['REALTIME_HOST'] or 'localhost'}:3026"
		contacts:
			url: "http://#{process.env['CONTACTS_HOST'] or 'localhost'}:3036"
		sixpack:
			url: ""
		# references:
		# 	url: "http://localhost:3040"
		notifications:
			url: "http://#{process.env['NOTIFICATIONS_HOST'] or 'localhost'}:3042"
		analytics:
			url: "http://#{process.env['ANALYTICS_HOST'] or 'localhost'}:3050"
		linkedUrlProxy:
			url: process.env['LINKED_URL_PROXY']

	templates:
		user_id: process.env.TEMPLATES_USER_ID or "5395eb7aad1f29a88756c7f2"
		showSocialButtons: false
		showComments: false

	# cdn:
	# 	web:
	# 		host:"http://nowhere.sharelatex.dev"
	#		darkHost:"http://cdn.sharelatex.dev:3000"

	# Where your instance of ShareLaTeX can be found publically. Used in emails
	# that are sent out, generated links, etc.
	siteUrl : siteUrl = process.env['PUBLIC_URL'] or 'http://localhost:3000'

	# cookie domain
	# use full domain for cookies to only be accessible from that domain,
	# replace subdomain with dot to have them accessible on all subdomains
	# cookieDomain: ".sharelatex.dev"
	cookieName: "sharelatex.sid"

	# this is only used if cookies are used for clsi backend
	#clsiCookieKey: "clsiserver"

	# Same, but with http auth credentials.
	httpAuthSiteUrl: 'http://#{httpAuthUser}:#{httpAuthPass}@localhost:3000'


	maxEntitiesPerProject: 2000

	# Security
	# --------
	security:
		sessionSecret: sessionSecret
		bcryptRounds: 12 # number of rounds used to hash user passwords (raised to power 2)

	httpAuthUsers: httpAuthUsers

	# Default features
	# ----------------
	#
	# You can select the features that are enabled by default for new
	# new users.
	defaultFeatures: defaultFeatures =
		collaborators: -1
		dropbox: true
		versioning: true
		compileTimeout: 180
		compileGroup: "standard"
		references: true
		templates: true
		trackChanges: true

	plans: plans = [{
		planCode: "personal"
		name: "Personal"
		price: 0
		features: defaultFeatures
	}]

	enableSubscriptions:false

	enabledLinkedFileTypes: (process.env['ENABLED_LINKED_FILE_TYPES'] or '').split(',')

	# i18n
	# ------
	#
	i18n:
		subdomainLang:
			www: {lngCode:"en", url: siteUrl}
		defaultLng: "en"

	# Spelling languages
	# ------------------
	#
	# You must have the corresponding aspell package installed to
	# be able to use a language.
	languages: [
		{name: "English", code: "en"},
		{name: "French", code: "fr"}
	]


	# Password Settings
	# -----------
	# These restrict the passwords users can use when registering
	# opts are from http://antelle.github.io/passfield
	# passwordStrengthOptions:
	# 	pattern: "aA$3"
	# 	length:
	# 		min: 6
	# 		max: 128

	# Email support
	# -------------
	#
	#	ShareLaTeX uses nodemailer (http://www.nodemailer.com/) to send transactional emails.
	#	To see the range of transport and options they support, see http://www.nodemailer.com/docs/transports
	#email:
	#	fromAddress: ""
	#	replyTo: ""
	#	lifecycle: false
	## Example transport and parameter settings for Amazon SES
	#	transport: "SES"
	#	parameters:
	#		AWSAccessKeyID: ""
	#		AWSSecretKey: ""


	# Third party services
	# --------------------
	#
	# ShareLaTeX's regular newsletter is managed by Markdown mail. Add your
	# credentials here to integrate with this.
	# markdownmail:
	# 	secret: ""
	# 	list_id: ""
	#
	# Fill in your unique token from various analytics services to enable
	# them.
	# analytics:
	# 	ga:
	# 		token: ""
	#
	# ShareLaTeX's help desk is provided by tenderapp.com
	# tenderUrl: ""
	#
	# Client-side error logging is provided by getsentry.com
	# sentry:
	#   src: ""
	#   publicDSN: ""
	#
	# src should be either a remote url like
	#    //cdn.ravenjs.com/1.1.22/jquery,native/raven.min.js
	# or a local file in the js/libs directory.
	# The publicDSN is the token for the client-side getSentry service.

	# Production Settings
	# -------------------

	# Should javascript assets be served minified or not. Note that you will
	# need to run `grunt compile:minify` within the web-sharelatex directory
	# to generate these.
	useMinifiedJs: process.env['MINIFIED_JS'] == 'true' or false

	# Should static assets be sent with a header to tell the browser to cache
	# them.
	cacheStaticAssets: false

	# If you are running ShareLaTeX over https, set this to true to send the
	# cookie with a secure flag (recommended).
	secureCookie: false

	# If you are running ShareLaTeX behind a proxy (like Apache, Nginx, etc)
	# then set this to true to allow it to correctly detect the forwarded IP
	# address and http/https protocol information.
	behindProxy: false

	# Cookie max age (in milliseconds). Set to false for a browser session.
	cookieSessionLength: 5 * 24 * 60 * 60 * 1000 # 5 days

	# When true, only allow invites to be sent to email addresses that
	# already have user accounts
	restrictInvitesToExistingAccounts: false

	# Should we allow access to any page without logging in? This includes
	# public projects, /learn, /templates, about pages, etc.
	allowPublicAccess: if process.env["SHARELATEX_ALLOW_PUBLIC_ACCESS"] == 'true' then true else false

	# Use a single compile directory for all users in a project
	# (otherwise each user has their own directory)
	# disablePerUserCompiles: true

	# Maximum size of text documents in the real-time editing system.
	max_doc_length: 2 * 1024 * 1024 # 2mb

	# Internal configs
	# ----------------
	path:
		# If we ever need to write something to disk (e.g. incoming requests
		# that need processing but may be too big for memory, then write
		# them to disk here).
		dumpFolder: Path.resolve __dirname + "/../data/dumpFolder"
		uploadFolder: Path.resolve __dirname + "/../data/uploads"

	# Automatic Snapshots
	# -------------------
	automaticSnapshots:
		# How long should we wait after the user last edited to
		# take a snapshot?
		waitTimeAfterLastEdit: 5 * minutes
		# Even if edits are still taking place, this is maximum
		# time to wait before taking another snapshot.
		maxTimeBetweenSnapshots: 30 * minutes

	# Smoke test
	# ----------
	# Provide log in credentials and a project to be able to run
	# some basic smoke tests to check the core functionality.
	#
	# smokeTest:
	# 	user: ""
	# 	password: ""
	# 	projectId: ""

	appName: "ShareLaTeX (Community Edition)"
	#adminEmail: "placeholder@example.com"
	adminEmail: "alexfotios@gmail.com"
	
	brandPrefix: "" # Set to 'ol-' for overleaf styles

	nav:
		title: "ShareLaTeX Community Edition"

		left_footer: [{
			text: "Powered by <a href='https://www.sharelatex.com'>ShareLaTeX</a> © 2016"
		}]

		right_footer: [{
			text: "<i class='fa fa-github-square'></i> Fork on Github!"
			url: "https://github.com/sharelatex/sharelatex"
		}]

		showSubscriptionLink: false

		header_extras: []
		# Example:
		#   header_extras: [{text: "Some Page", url: "http://example.com/some/page", class: "subdued"}]

	customisation: {}

#	templates: [{
#		name : "cv_or_resume",
#		url : "/templates/cv"
#	}, {
#		name : "cover_letter",
#		url : "/templates/cover-letters"
#	}, {
#		name : "journal_article",
#		url : "/templates/journals"
#	}, {
#		name : "presentation",
#		url : "/templates/presentations"
#	}, {
#		name : "thesis",
#		url : "/templates/thesis"
#	}, {
#		name : "bibliographies",
#		url : "/templates/bibliographies"
#	}, {
#		name : "view_all",
#		url : "/templates"
#	}]


	redirects:
		"/templates/index": "/templates/"

	proxyUrls: {}

	reloadModuleViewsOnEachRequest: true

	domainLicences: [

	]

	sixpack:
		domain:""
	# ShareLaTeX Server Pro options (https://www.sharelatex.com/university/onsite.html)
	# ----------



	# LDAP
	# ----------
	# Settings below use a working LDAP test server kindly provided by forumsys.com
	# When testing with forumsys.com use username = einstein and password = password

	# ldap :
	# 	host: 'ldap://ldap.forumsys.com'
	# 	dn: 'uid=:userKey,dc=example,dc=com'
	# 	baseSearch: 'dc=example,dc=com'
	# 	filter: "(uid=:userKey)"
	# 	failMessage: 'LDAP User Fail'
	# 	fieldName: 'LDAP User'
	# 	placeholder: 'email@example.com'
	# 	emailAtt: 'mail'
	# 	anonymous: false
	#	adminDN: 'cn=read-only-admin,dc=example,dc=com'
	#	adminPW: 'password'
	#	starttls: true
	#	tlsOptions:
	#		rejectUnauthorized: false
	#		ca: ['/etc/ldap/ca_certs.pem']

	#templateLinks: [{
	#	name : "CV projects",
	#	url : "/templates/cv"
	#},{
	#	name : "all projects",
	#	url: "/templates/all"
	#}]

	rateLimits:
		autoCompile:
			everyone: 100
			standard: 25
