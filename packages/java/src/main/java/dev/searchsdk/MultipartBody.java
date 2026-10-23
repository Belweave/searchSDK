package dev.searchsdk;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Buffered caller-supplied multipart data. File reads and unbounded streaming uploads are excluded. */
public final class MultipartBody {
    public record Part(String name,String filename,String contentType,byte[] content) {
        public Part {
            if(!label(name,128) || filename!=null && !label(filename,255) ||
                contentType!=null && !contentType.matches("[a-zA-Z0-9!#$&^_.+-]+/[a-zA-Z0-9!#$&^_.+-]+") || content==null)
                throw new SearchException(SearchException.Code.INVALID_REQUEST);
            Json.stringify(name);if(filename!=null)Json.stringify(filename);content=content.clone();
        }
        private static boolean label(String value,int maximum) {
            return value!=null && !value.isEmpty() && value.length()<=maximum && value.chars().noneMatch(c -> c<32 || c==127);
        }
        @Override public byte[] content() { return content.clone(); }
        @Override public String toString() { return "Multipart.Part[redacted]"; }
        public static Part text(String name,String value) { return new Part(name,null,null,value.getBytes(StandardCharsets.UTF_8)); }
    }
    private final List<Part> parts;
    public MultipartBody(List<Part> parts) {
        if(parts==null || parts.isEmpty() || parts.size()>1000) throw new SearchException(SearchException.Code.INVALID_REQUEST);
        this.parts=List.copyOf(parts);
    }
    public List<Part> parts() { return parts; }
    MultipartBody withCredential(String name,String value) {
        if(parts.stream().anyMatch(p -> p.name().equals(name))) throw new SearchException(SearchException.Code.INVALID_REQUEST);
        List<Part> copy=new ArrayList<>(parts); copy.add(Part.text(name,value)); return new MultipartBody(copy);
    }
    record Encoded(String contentType,byte[] bytes) {}
    Encoded encode(int maximum) {
        String boundary="searchsdk"+UUID.randomUUID().toString().replace("-","");
        ByteArrayOutputStream out=new ByteArrayOutputStream();
        for(Part part:parts) {
            String header="--"+boundary+"\r\nContent-Disposition: form-data; name=\""+quoted(part.name())+"\""+
                (part.filename()==null ? "" : "; filename=\""+quoted(part.filename())+"\"")+"\r\n"+
                (part.contentType()==null ? "" : "Content-Type: "+part.contentType()+"\r\n")+"\r\n";
            append(out,header.getBytes(StandardCharsets.UTF_8),maximum); append(out,part.content(),maximum);
            append(out,"\r\n".getBytes(StandardCharsets.UTF_8),maximum);
        }
        append(out,("--"+boundary+"--\r\n").getBytes(StandardCharsets.UTF_8),maximum);
        return new Encoded("multipart/form-data; boundary="+boundary,out.toByteArray());
    }
    private static String quoted(String value) { return value.replace("\\","\\\\").replace("\"","\\\""); }
    private static void append(ByteArrayOutputStream out,byte[] bytes,int maximum) {
        if(bytes.length>maximum-out.size()) throw new SearchException(SearchException.Code.INVALID_REQUEST); out.writeBytes(bytes);
    }
    @Override public String toString() { return "MultipartBody[redacted]"; }
}
