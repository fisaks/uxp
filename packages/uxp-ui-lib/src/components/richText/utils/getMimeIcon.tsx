import DescriptionIcon from '@mui/icons-material/Description'; // Default
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import MovieIcon from '@mui/icons-material/Movie';

export function getMimeIcon(mimetype: string) {
  if (mimetype.startsWith('image/')) return <ImageIcon />;
  if (mimetype === 'application/pdf') return <PictureAsPdfIcon />;
  if (mimetype.startsWith('audio/')) return <AudiotrackIcon />;
  if (mimetype.startsWith('video/')) return <MovieIcon />;
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return <DescriptionIcon />;
  return <InsertDriveFileIcon />;
}
