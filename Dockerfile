FROM nginx:alpine
COPY . /usr/share/nginx/html
RUN sed -i 's/listen       80;/listen 8080;/' /etc/nginx/conf.d/default.conf && \
    sed -i 's#application/javascript                   js;#application/javascript                   js mjs;#' /etc/nginx/mime.types && \
    printf 'types { model/gltf-binary glb; audio/ogg ogg; application/manifest+json webmanifest; }\n' > /etc/nginx/conf.d/types.conf
EXPOSE 8080
