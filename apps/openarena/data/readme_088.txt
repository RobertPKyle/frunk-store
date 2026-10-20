

	OpenArena v0.8.8 patch 
				2012/01/23
	

------------------
INSTALLING
------------------

	To install the patch, simply extract the archive to your OpenArena 0.8.1 or 0.8.5 folder.
	Overwrite all files it asks to.


	The "deprecated" engine is not updated in this release. Windows 98/ME users will need to install
KernelEx to run the game. We apologise for the inconvenience this may cause. We tried to maintain older OS
support :/
	
------------------
VIDEO PROBLEMS
------------------

	It has been discovered that 3dfx Voodoo Graphics, and Voodoo2 3d accellerators 
	no longer work with OpenArena. 

	Voodoo Banshee, Voodoo3, Voodoo4 and Voodoo5 are unaffected, and should still function properly.

	It is recommended to use a recent MesaFX GL wrapper for 3dfx hardware.


------------------
CHANGES
------------------


	==ASSETS==

	- Two new single player campaign tiers
	- New maps:
		am_lavaarena
		am_lavactf
		am_lavactfxl
		am_mckinleyish2
		am_spacecont
		am_thornish
		mlca1
		mlctf1beta
		oa_bases3p3ta
		oasago1
		oa_thor
		pul1duel-oa
		pxlfan
	
	- New player model: Neko.	
	- Specular maps have been added to many player and weaponsmodels. 
		These can be disabled by turning off detail textures.
	- Invulnerability powerup and effects
	- Grappling hook model, shader, and sounds
	- Angelyss, Gargoyle have been reanimated
	- Liz and SMarine animation glitches fixed
	- Music
	- Many of the old maps got entity tweaks, gametype unlocking and other fixes.
	- Benchmark demo

	==GAME==

	- Fixed TEAMMATE kill message bug.
	- Prevent team changing and disconnect from changing team score in Team Deathmatch.
	- Don't let vampire resurrect dead players.
	- Now uses FFA spawnpoints in domination.
	- Workaround for Kamikaze bug.
	- g_autonextmap added ("Auto change level" in the menu). Randomly picks a new map once the current map has ended. The maps allowed for each gametype are configurable.
	- You can now see how much health the obelisk have left in Overload
	- Autoswitch weapon can now be set to only change to better or new weapons.
	- Chat beep can be disabled in options.
	- Changed default customvotefile to customvote.cfg.

	- Added the possibility for spawning in waves. The cvar g_respawntime says how often players should spawn.
	- Added a CVAR g_voteBan X - bans a player for X minutes using the KK-admin system
	- Added g_gravityModifier (default 1.0) that modifies g_gravity relatively to the value set by the map.
	- Additional dmflags. Most notably "Fast weapon switch" and "No self damage".
	- Added a CVAR g_damageModifier to modify damage of all weapons and triggers.
	- Added replace_* cvars like disable_*. Can be used like "set replace_weapon_shotgun weapon_bfg" for replacing shutgun by BFG.

	- Handicap is reset to 100 once returned to the main menu. It is no longer changeable thorugh the GUI to prevent new players from hurting themself.
	- Added "Click to respawn"-message. Tells the player how long until they are allowed to respawn. Very relevant for wave spawning.

	==ENGINE== 


	- New specular code, r_specmode 1 to enable

	- New environment map code, r_envmode 1 to enable

	- Cascaded bloom, which is more 'natural', and is much faster on lower end hardware
		r_bloom_cascade 1 to enable

	- Support for GLSL shaders! 
	
	- Bloom is not allowed if we don't have 32-bit color for textures. This stops the user from playing with corrupt bloom in 16-bit color since the bloom code doesn't really support that yet.


------------------
CREDITS FOR THIS RELEASE
------------------


	sago007 for coding
	jackoverfull for OSX binaries
	jute gyte for the music
	LordHavoc for OSX engine fixing
	Udi for shader fixing, icon fixing, graphics fixing
	Gig for testing and the benchmark demo
	tcppjp for the new cascaded bloom
	Neon Knight for new maps, compiling, mapfixing
	pulchr for new maps
	boczeq for new map (Blitzkrieg)
	meisterlampe for new maps (mlca1 and mlctf1beta)
	Thor001 for new map (oa_thor)
	PigCell for new map (pxlfan)
	Hitchhiker for GLSL implementation
	fromhell for rampant procrastinating, modeling, sounds, and other crap.



------------------
LICENSE
------------------
	

	The program and data are licensed under the GNU GPL v2. See the file 'COPYING' for details.

	The source for the media can be obtained from the OpenArena site, and the source for the game code can be found on the openarenaexpanded project on googlecode.