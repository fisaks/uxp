import { BlueprintIcon } from "@uhn/blueprint";
import BalconyIcon from "@mui/icons-material/Balcony";
import BathroomIcon from "@mui/icons-material/Bathroom";
import BedIcon from "@mui/icons-material/Bed";
import BoltIcon from "@mui/icons-material/Bolt";
import OutletIcon from "@mui/icons-material/Outlet";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import CottageIcon from "@mui/icons-material/Cottage";
import CribIcon from "@mui/icons-material/Crib";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import DirectionsCarFilledIcon from "@mui/icons-material/DirectionsCarFilled";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import DoorFrontIcon from "@mui/icons-material/DoorFront";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import FlashlightOnIcon from "@mui/icons-material/FlashlightOn";
import FluorescentIcon from "@mui/icons-material/Fluorescent";
import GarageIcon from "@mui/icons-material/Garage";
import HandymanIcon from "@mui/icons-material/Handyman";
import HotTubIcon from "@mui/icons-material/HotTub";
import KitchenIcon from "@mui/icons-material/Kitchen";
import LayersIcon from "@mui/icons-material/Layers";
import LightIcon from "@mui/icons-material/Light";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import IronIcon from "@mui/icons-material/Iron";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import BrunchDiningIcon from "@mui/icons-material/BrunchDining";
import NatureIcon from "@mui/icons-material/Nature";
import OpacityIcon from "@mui/icons-material/Opacity";
import OutdoorGrillIcon from "@mui/icons-material/OutdoorGrill";
import PowerIcon from "@mui/icons-material/Power";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import ScheduleIcon from "@mui/icons-material/Schedule";
import SensorsIcon from "@mui/icons-material/Sensors";
import SpeedIcon from "@mui/icons-material/Speed";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import TheaterComedyIcon from "@mui/icons-material/TheaterComedy";
import TheatersIcon from "@mui/icons-material/Theaters";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import TvIcon from "@mui/icons-material/Tv";
import TimerIcon from "@mui/icons-material/Timer";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import TuneIcon from "@mui/icons-material/Tune";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import WcIcon from "@mui/icons-material/Wc";
import WeekendIcon from "@mui/icons-material/Weekend";
import WindowIcon from "@mui/icons-material/Window";
import { SvgIconProps } from "@mui/material";
import { ReedRelayClosedIcon } from "../resource/components/relay-icon";
import ShowerIcon from '@mui/icons-material/Shower';

export const blueprintIconMap: Record<BlueprintIcon, React.ComponentType<SvgIconProps>> = {
    // Lighting
    "lighting:bulb": LightbulbIcon,
    "lighting:ceiling": LightIcon,
    "lighting:flashlight": FlashlightOnIcon,
    "lighting:indicator": FluorescentIcon,
    // Power
    "power:socket": PowerIcon,
    "power:plug": OutletIcon,
    "power:switch": PowerSettingsNewIcon,
    "power:energy": ElectricBoltIcon,
    "power:current": BoltIcon,
    // Sensor
    "sensor:motion": DirectionsRunIcon,
    "sensor:pir": SensorsIcon,
    "sensor:temperature": ThermostatIcon,
    "sensor:humidity": OpacityIcon,
    "sensor:light": WbSunnyIcon,
    // Control
    "control:button": TouchAppIcon,
    "control:dimmer": TuneIcon,
    "control:valve": LinearScaleIcon,
    "control:timer": TimerIcon,
    "control:schedule": ScheduleIcon,
    "control:toggle": ToggleOnIcon,
    "control:speed": SpeedIcon,
    "control:relay": ReedRelayClosedIcon,
    // Opening
    "opening:door": DoorFrontIcon,
    "opening:window": WindowIcon,
    // Room
    "room:kitchen": KitchenIcon,
    "room:bathroom": ShowerIcon,
    "room:bedroom": BedIcon,
    "room:living": WeekendIcon,
    "room:hallway": MeetingRoomIcon,
    "room:garage": GarageIcon,
    "room:outdoor": OutdoorGrillIcon,
    "room:generic": MeetingRoomIcon,
    "room:toilet": WcIcon,
    "room:children": ChildCareIcon,
    "room:baby": CribIcon,
    "room:youth": SportsEsportsIcon,
    "room:theatre": TheatersIcon,
    "room:sauna": HotTubIcon,
    "room:gym": FitnessCenterIcon,
    "room:dining": RestaurantIcon,
    "room:utility": HandymanIcon,
    "room:terrace": BalconyIcon,
    "room:laundry": LocalLaundryServiceIcon,
    "room:ironing": IronIcon,
    "room:wardrobe": CheckroomIcon,
    // Structure
    "structure:home": CottageIcon,
    "structure:floor": LayersIcon,
    // Scene
    "scene:default": TheaterComedyIcon,
    "scene:night": DarkModeIcon,
    "scene:away": DirectionsCarFilledIcon,
    "scene:eco": NatureIcon,
    "scene:dining": BrunchDiningIcon,
    "scene:tv": TvIcon,
    // Status
    "status:dashboard": DashboardIcon,
    "status:device": DeviceHubIcon,
};

export function getBlueprintIcon(icon: BlueprintIcon | undefined): React.ComponentType<SvgIconProps> | undefined {
    return icon ? blueprintIconMap[icon] : undefined;
}
