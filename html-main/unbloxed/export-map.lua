-- Unbloxed map exporter: run in Roblox Studio (Claude runs it through the Studio MCP).
-- Exports every block Part under workspace.Map (or all of workspace if there is no Map folder).
-- Special part names:  Spawn            -> a spawn point (part itself is not drawn)
--                      SpawnLocation    -> a spawn point (still drawn as floor)
--                      Pickup_<kind>    -> a pickup stand. kind = Frostfang, Emberlash, Gloomreaver,
--                                          ToxinEdge, Sunsteel, Wraithblade, Galecutter, Shield, Med, Boots, Stone
local HttpService = game:GetService("HttpService")
local KINDS = {Frostfang="0",Emberlash="1",Gloomreaver="2",ToxinEdge="3",Sunsteel="4",Wraithblade="5",Galecutter="6",
	Shield="shield",Med="med",Boots="boots",Stone="stone"}
local root = workspace:FindFirstChild("Map") or workspace
local out = {parts={}, spawns={}, pickups={}, top=-1e9}
local function r(n) return math.floor(n*1000+0.5)/1000 end
for _, p in ipairs(root:GetDescendants()) do
	local m = p:FindFirstAncestorOfClass("Model")
	if p:IsA("BasePart") and not p:IsA("Terrain") and not (m and m:FindFirstChildOfClass("Humanoid")) then
		local pos = p.Position
		if p.Name == "Spawn" or p:IsA("SpawnLocation") then
			table.insert(out.spawns, {r(pos.X), r(pos.Y + p.Size.Y/2), r(pos.Z)})
			if not p:IsA("SpawnLocation") then continue end
		end
		local kind = p.Name:match("^Pickup_(%w+)$")
		if kind and KINDS[kind] then
			table.insert(out.pickups, {r(pos.X), r(pos.Y + p.Size.Y/2), r(pos.Z), KINDS[kind]})
			continue
		end
		local rx, ry, rz = p.CFrame:ToEulerAnglesYXZ()
		local c = p.Color
		table.insert(out.parts, {r(pos.X), r(pos.Y), r(pos.Z), r(p.Size.X), r(p.Size.Y), r(p.Size.Z),
			r(rx), r(ry), r(rz), string.format("#%02x%02x%02x", c.R*255, c.G*255, c.B*255), r(p.Transparency), p.CanCollide and 1 or 0})
		out.top = math.max(out.top, pos.Y + p.Size.Y/2)
	end
end
return HttpService:JSONEncode(out)
