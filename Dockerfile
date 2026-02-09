FROM jupyter/minimal-notebook:python-3.11

USER root

RUN mamba install -c conda-forge "jupyterlab>=4,<5" && mamba update pip && mamba clean --all -f -y
COPY ./ /tmp/jupyterlab_wall
RUN cat /tmp/jupyterlab_wall/jupyter_jupyterlab_wall_config.py >> /home/${NB_USER}/.jupyter/jupyter_server_config.py
RUN rm -rf /tmp/jupyterlab_wall/jupyterlab_wall.egg-info
RUN cd /tmp/jupyterlab_wall && python3 -m pip install . && cd -
RUN fix-permissions "${CONDA_DIR}" && fix-permissions "/home/${NB_USER}"

USER jovyan
